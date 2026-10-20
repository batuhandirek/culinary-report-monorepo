import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { districtNames } from 'src/modules/cities/util/city.js';

import {
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from '../constants/venue-status.constant.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueSnapshot } from '../entities/venue-snapshot.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { VenueRepository } from '../repositories/venue.repository.js';
import {
	GooglePlaceDetailFields,
	mergeVenueDetails,
	venueDetailsFromItem,
} from '../util/venue-details.js';
import {
	isOpening,
	statusChangeKind,
	VenueOpenState,
	venueOpenState,
} from '../util/venue-status.js';

/** One item of `compass/crawler-google-places`. */
export interface GooglePlaceItem extends GooglePlaceDetailFields {
	placeId?: string;
	title?: string;
	city?: string;
	neighborhood?: string;
	street?: string;
	postalCode?: string;
	categoryName?: string;
	categories?: string[];
	location?: { lat: number; lng: number };
	price?: string;
	website?: string;
	phone?: string;
	url?: string;
	permanentlyClosed?: boolean;
	totalScore?: number;
	reviewsCount?: number;
	searchString?: string;
}

@Injectable()
export class VenueService {
	constructor(
		private readonly em: EntityManager,
		private readonly venueRepository: VenueRepository,
	) {}

	/**
	 * Creates or updates the venue a Google Maps item describes, and records today's rating
	 * as a snapshot. A new venue belongs to `city`, the city whose scrape found it (without one
	 * only known venues are updated); a known venue keeps its city. Records a `VenueStatusChange`
	 * when a known venue's closed flags flip, and `opened` for a new place when `status.openings`
	 * (a city-wide scrape after the city's first one) and `isOpening` say so. Does not flush.
	 */
	async saveGooglePlace(
		item: GooglePlaceItem,
		now = new Date(),
		city?: City,
		status: { source: VenueScrapeSourceEnum; openings?: boolean } = {
			source: VenueScrapeSourceEnum.DETAILS,
		},
	): Promise<Venue | null> {
		if (!item.placeId || !item.title) return null;
		const known = await this.venueRepository.findOne({ placeId: item.placeId });
		if (!known && !city) return null;
		const venue =
			known ??
			this.venueRepository.create({ placeId: item.placeId, name: item.title, city: city! });
		const before = known ? venueOpenState(known) : null;

		venue.name = item.title;
		venue.locality = item.city ?? null;
		// Keep a district filled from the postal code when Google leaves it empty
		venue.district = item.neighborhood ?? venue.district ?? null;
		venue.street = item.street ?? null;
		venue.postalCode = item.postalCode ?? null;
		venue.category = item.categoryName ?? null;
		venue.categories = item.categories ?? [];
		venue.lat = item.location?.lat ?? null;
		venue.lng = item.location?.lng ?? null;
		venue.priceLevel = item.price ?? null;
		// A new website gets its icon on the next favicon run
		if ((item.website ?? null) !== (venue.website ?? null)) venue.faviconCheckedAt = null;
		venue.website = item.website ?? null;
		venue.phone = item.phone ?? null;
		venue.googleUrl = item.url ?? null;
		venue.closed = !!item.permanentlyClosed;
		// Only what the item carries: a cheap list scrape must not erase a detail page's fields
		const details = mergeVenueDetails(venue.details, venueDetailsFromItem(item));
		if (details) {
			venue.details = details;
			venue.detailsAt = now;
		}
		this.recordStatusChange(venue, before, item, now, status);
		await this.recordRating(venue, item, now);
		return venue;
	}

	private recordStatusChange(
		venue: Venue,
		before: VenueOpenState | null,
		item: GooglePlaceItem,
		at: Date,
		status: { source: VenueScrapeSourceEnum; openings?: boolean },
	): void {
		const after = venueOpenState(venue);
		const kind =
			before ? statusChangeKind(before, after)
			: isOpening(!!status.openings, after, item.reviewsCount) ?
				VenueStatusChangeKindEnum.OPENED
			:	null;
		if (kind) this.em.create(VenueStatusChange, { venue, at, kind, source: status.source });
	}

	/**
	 * Sets the venue's all-time Google rating and review count and records them as the day's
	 * snapshot (one per venue and day). Does not flush.
	 */
	async recordRating(
		venue: Venue,
		figures: { totalScore?: number | null; reviewsCount?: number | null },
		now = new Date(),
	): Promise<void> {
		venue.rating = figures.totalScore ?? null;
		venue.reviewsCount = figures.reviewsCount ?? null;

		const snapshotDate = now.toISOString().slice(0, 10);
		const snapshot =
			(venue.id ?
				await this.em.findOne(VenueSnapshot, { venue: venue.id, snapshotDate })
			:	null) ?? this.em.create(VenueSnapshot, { venue, snapshotDate });
		snapshot.rating = figures.totalScore ?? null;
		snapshot.reviewsCount = figures.reviewsCount ?? null;
	}

	/**
	 * Google often leaves the district empty, or gives a neighbourhood that is not one of the
	 * city's districts. Fills it from the district listing the venue's postal code
	 * (`City.districts`), else from the most common district among the city's other venues
	 * with that postal code. Returns how many venues it filled.
	 */
	async fillDistricts(city: City): Promise<number> {
		const names = districtNames(city);
		if (!names.length) return 0;
		const placeholders = names.map(() => '?').join(', ');
		const notADistrict = `(venues.district is null or venues.district not in (${placeholders}))`;
		const conn = this.em.getConnection();
		let filled = 0;

		const listed = city.districts.flatMap(d => d.postalCodes.map(code => [code, d.name]));
		if (listed.length) {
			const result = await conn.execute(
				`update venues set district = x.district
				from (values ${listed.map(() => '(?, ?)').join(', ')}) as x(postal_code, district)
				where venues.city_id = ? and venues.postal_code = x.postal_code and ${notADistrict}`,
				[...listed.flat(), city.id, ...names],
				'run',
			);
			filled += (result as { affectedRows?: number }).affectedRows ?? 0;
		}

		const result = await conn.execute(
			`with counts as (
				select postal_code, district, count(*) as n from venues
				where city_id = ? and postal_code is not null and district in (${placeholders})
				group by postal_code, district
			),
			majority as (
				select distinct on (postal_code) postal_code, district from counts
				order by postal_code, n desc
			)
			update venues set district = majority.district
			from majority
			where venues.city_id = ? and majority.postal_code = venues.postal_code and ${notADistrict}`,
			[city.id, ...names, city.id, ...names],
			'run',
		);
		return filled + ((result as { affectedRows?: number }).affectedRows ?? 0);
	}
}
