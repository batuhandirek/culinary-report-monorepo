import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import type { City } from 'src/modules/cities/entities/city.entity.js';

import { Venue } from '../entities/venue.entity.js';
import {
	ReservationPlatformEnum,
	VenueReservationSample,
} from '../entities/venue-reservation-sample.entity.js';
import {
	PartialAvailabilityError,
	type ReservationAvailability,
	type ReservationAvailabilityProvider,
	type ReservationTarget,
} from '../interfaces/reservation-availability.interface.js';
import { comingWeekendEvenings, reservationPlatformOf, reservationUrlOf } from '../util/reservations.js';

import { GoogleReserveAvailabilityService } from './google-reserve-availability.service.js';
import { OpenTableAvailabilityService } from './opentable-availability.service.js';
import { TheForkAvailabilityService } from './thefork-availability.service.js';

/** One venue's evening as `cityEvenings` reads it: booked out 0–100, from its latest sample. */
export interface CityEveningBooked {
	venueId: string;
	district: string | null;
	forDate: string;
	booked: number;
}

/** What a sampling run did, for the pipeline run's result. */
export interface ReservationSampleResult {
	/** Venues handed in */
	venues: number;
	/** Of those, without a link on a platform we can sample */
	noPlatform: number;
	/** Venues with a link left out by the cap */
	capped: number;
	samples: number;
	byPlatform: Record<string, number>;
}

/**
 * The one writer of `VenueReservationSample` (and of `Venue.reservationPartner`): open evening
 * tables on the coming Friday and Saturday, asked of the booking page a venue's hand-set
 * `bookingUrl`, Google reservation link or website points to: Google's own booking page (free),
 * TheFork or OpenTable (Apify). Venues on another platform are skipped.
 */
@Injectable()
export class VenueReservationService {
	private readonly logger = new Logger(VenueReservationService.name);
	private readonly providers: Map<ReservationPlatformEnum, ReservationAvailabilityProvider>;

	constructor(
		private readonly em: EntityManager,
		theFork: TheForkAvailabilityService,
		openTable: OpenTableAvailabilityService,
		google: GoogleReserveAvailabilityService,
	) {
		this.providers = new Map<ReservationPlatformEnum, ReservationAvailabilityProvider>([
			[theFork.platform, theFork],
			[openTable.platform, openTable],
			[google.platform, google],
		]);
	}

	/**
	 * Where each venue books, if it is a platform we can sample, in the venues' order; at most
	 * `maxVenues` venues get a target.
	 */
	targets(
		venues: Venue[],
		city: Pick<City, 'name' | 'timezone'>,
		maxVenues = Infinity,
	): Map<ReservationPlatformEnum, ReservationTarget[]> {
		const byPlatform = new Map<ReservationPlatformEnum, ReservationTarget[]>();
		let count = 0;
		for (const venue of venues) {
			const url = reservationUrlOf(venue);
			const platform = reservationPlatformOf(url);
			if (!platform || !url) continue;
			if (count++ >= maxVenues) break;
			byPlatform.set(platform, [
				...(byPlatform.get(platform) ?? []),
				{ venueId: venue.id, name: venue.name, url, cityName: city.name, timeZone: city.timezone },
			]);
		}
		return byPlatform;
	}

	/**
	 * Samples these venues (in priority order; the first `maxVenues` with a sampleable link) for
	 * the coming Friday and Saturday evening, in the city's time zone. The budget is split evenly
	 * between the paid platforms in use; Google's page costs nothing. Flushes.
	 */
	async sample(
		venues: Venue[],
		city: Pick<City, 'name' | 'timezone'>,
		budgetUsd: number,
		{ now = new Date(), maxVenues = Infinity }: { now?: Date; maxVenues?: number } = {},
	): Promise<ReservationSampleResult> {
		const linked = venues.filter(v => reservationUrlOf(v)).length;
		const targets = this.targets(venues, city, maxVenues);
		const taken = [...targets.values()].reduce((n, list) => n + list.length, 0);
		const dates = comingWeekendEvenings(now, city.timezone);
		const paid = [...targets.keys()].filter(p => !this.providers.get(p)?.free).length;
		const byId = new Map(venues.map(v => [v.id, v]));
		const byPlatform: Record<string, number> = {};
		let samples = 0;
		const errors: string[] = [];
		for (const [platform, list] of targets) {
			const provider = this.providers.get(platform);
			if (!provider) continue;
			let found: ReservationAvailability[];
			try {
				found = await provider.availability(list, dates, provider.free ? 0 : budgetUsd / paid);
			} catch (e) {
				// One platform failing keeps the other's samples (and its own, taken before it
				// stopped), then fails the run
				found = e instanceof PartialAvailabilityError ? e.found : [];
				errors.push(`${platform}: ${(e as Error).message}`);
				this.logger.error(`${platform} availability failed: ${(e as Error).message}`);
			}
			for (const a of found) {
				const venue = byId.get(a.venueId) ?? this.em.getReference(Venue, a.venueId);
				this.em.create(VenueReservationSample, {
					venue,
					platform,
					sampledAt: now,
					forDate: a.forDate,
					slotsOpen: a.slotsOpen,
					slotsAsked: a.slotsAsked,
					partySize: a.partySize,
				});
				// Every Google sample rewrites the partner, so a venue that moves platform updates
				if (a.partner !== undefined) venue.reservationPartner = a.partner;
			}
			byPlatform[platform] = found.length;
			samples += found.length;
		}
		await this.em.flush();
		if (errors.length) throw new Error(`Reservation sampling failed (${errors.join('; ')})`);
		return { venues: venues.length, noPlatform: venues.length - linked, capped: linked - taken, samples, byPlatform };
	}

	/**
	 * Sets (or clears, with null or blank) a venue's booking link. Only a TheFork, OpenTable or
	 * Google booking page (`google.com/maps/reserve/…`, pasted from Maps when the scrape missed
	 * it) is accepted: the link exists for sampling, and any other URL would be silently skipped.
	 * Flushes.
	 */
	async setBookingUrl(venueId: string, url: string | null): Promise<Venue> {
		const venue = await this.em.findOneOrFail(Venue, { id: venueId });
		const trimmed = url?.trim() || null;
		if (trimmed && (!/^https?:\/\//i.test(trimmed) || !reservationPlatformOf(trimmed)))
			throw new BadRequestException(
				'The booking link must be a TheFork, OpenTable or Google booking page (https://…)',
			);
		venue.bookingUrl = trimmed;
		await this.em.flush();
		return venue;
	}

	/** A venue's (or several venues') samples for evenings in `[fromDate, toDate)` (`YYYY-MM-DD`), oldest first. */
	async between(venueIds: string | string[], fromDate: string, toDate: string): Promise<VenueReservationSample[]> {
		if (Array.isArray(venueIds) && venueIds.length === 0) return [];
		return this.em.find(
			VenueReservationSample,
			{ venue: Array.isArray(venueIds) ? { $in: venueIds } : venueIds, forDate: { $gte: fromDate, $lt: toDate } },
			{ orderBy: { forDate: QueryOrder.ASC, sampledAt: QueryOrder.ASC } },
		);
	}

	/**
	 * How booked out every venue of a city sampled on these evenings was, one row per venue and
	 * evening (its latest sample), with the venue's district: what district and city medians are
	 * taken over. One query. `excludeVenueId` leaves the venue being compared out.
	 */
	async cityEvenings(cityId: string, dates: string[], excludeVenueId?: string): Promise<CityEveningBooked[]> {
		if (dates.length === 0) return [];
		const rows: { venue_id: string; district: string | null; for_date: string; booked: number }[] =
			await this.em.getConnection().execute(
				`select distinct on (s.venue_id, s.for_date)
					s.venue_id, v.district, s.for_date,
					(1 - least(s.slots_open, s.slots_asked)::float / s.slots_asked) * 100 as booked
				from venue_reservation_samples s join venues v on v.id = s.venue_id
				where v.city_id = ? and s.slots_asked > 0 and s.for_date in (${dates.map(() => '?').join(', ')})
					${excludeVenueId ? 'and v.id <> ?' : ''}
				order by s.venue_id, s.for_date, s.sampled_at desc`,
				[cityId, ...dates, ...(excludeVenueId ? [excludeVenueId] : [])],
			);
		return rows.map(r => ({ venueId: r.venue_id, district: r.district, forDate: r.for_date, booked: Number(r.booked) }));
	}

	/** A venue's latest samples, newest first. */
	async latest(venueId: string, limit = 12): Promise<VenueReservationSample[]> {
		return this.em.find(
			VenueReservationSample,
			{ venue: venueId },
			{ orderBy: { sampledAt: QueryOrder.DESC, forDate: QueryOrder.DESC }, limit },
		);
	}
}
