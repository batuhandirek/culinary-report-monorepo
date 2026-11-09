import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import type { TheForkInput, TheForkItem } from 'src/modules/apify/actors/thefork.actor.js';
import type { OpenTableItem } from 'src/modules/apify/actors/opentable.actor.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

import { Venue } from '../entities/venue.entity.js';
import {
	ReservationPlatformEnum,
	VenueReservationSample,
} from '../entities/venue-reservation-sample.entity.js';
import {
	PartialAvailabilityError,
	type ReservationAvailability,
	type ReservationTarget,
} from '../interfaces/reservation-availability.interface.js';
import {
	comingWeekendEvenings,
	reservationPlatformOf,
	reservationUrlOf,
} from '../util/reservations.js';

import { GoogleReserveAvailabilityService } from './google-reserve-availability.service.js';
import {
	OpenTableAvailabilityService,
	type OpenTableRun,
} from './opentable-availability.service.js';
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

/** What `planSample` hands the `sample-reservations` workflow: the targets per platform and the paid runs */
export interface ReservationPlan {
	/** The coming Friday and Saturday (`YYYY-MM-DD`) */
	dates: string[];
	venues: number;
	noPlatform: number;
	capped: number;
	/** Google's own booking page: fetched in a step, free */
	google: ReservationTarget[];
	/** TheFork: one run for every target */
	thefork: { targets: ReservationTarget[]; call: ActorCall<TheForkInput, TheForkItem> } | null;
	/** OpenTable: one run per domain and date */
	opentable: OpenTableRun[];
}

/** The paid runs' records, as the workflow hands them to `saveSamples`: null for a run that failed */
export interface ReservationRecords {
	thefork?: string | null;
	opentable: (string | null)[];
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

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly theFork: TheForkAvailabilityService,
		private readonly openTable: OpenTableAvailabilityService,
		private readonly google: GoogleReserveAvailabilityService,
	) {}

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
				{
					venueId: venue.id,
					name: venue.name,
					url,
					cityName: city.name,
					timeZone: city.timezone,
				},
			]);
		}
		return byPlatform;
	}

	/**
	 * The city's open venues in the order `sample`'s cap cuts them: the `won` brands' branches, the
	 * month's other `report` brands' branches, their competitors (`competitorVenueIds`), then the
	 * rest by their brand's lead score (in tens). Each band is shuffled, so Google sees no fixed
	 * order from one run to the next. Venues without a booking link come last: the run counts them
	 * as `noPlatform`.
	 */
	async sampleOrder(
		cityId: string,
		bands: { won: string[]; report: string[]; competitorVenueIds: string[] },
	): Promise<Venue[]> {
		const venues = await this.em.find(
			Venue,
			{ city: cityId, closed: false },
			{
				orderBy: [
					{ brand: { leadScore: QueryOrder.DESC_NULLS_LAST } },
					{ id: QueryOrder.ASC },
				],
			},
		);
		const [linked, unlinked] = _.partition(venues, v => reservationUrlOf(v));
		const band = (venue: Venue) =>
			bands.won.includes(venue.brand.id) ? 0
			: bands.report.includes(venue.brand.id) ? 1
			: bands.competitorVenueIds.includes(venue.id) ? 2
			: 3;
		const byBand = _.groupBy(linked, band);
		// The rest keep their lead-score order between groups of ten, shuffled inside each
		return [
			...[0, 1, 2, 3].flatMap(b =>
				b < 3 ?
					_.shuffle(byBand[b] ?? [])
				:	_.chunk(byBand[b] ?? [], 10).flatMap(chunk => _.shuffle(chunk)),
			),
			...unlinked,
		];
	}

	/**
	 * The `sample-reservations` plan: where each venue books (a platform we can sample, in the
	 * venues' order, at most `maxVenues`), the coming weekend's evenings, and the paid platforms'
	 * runs, each on its share of the budget (the free Google page takes none).
	 */
	planSample(
		venues: Venue[],
		city: Pick<City, 'name' | 'timezone'>,
		budgetUsd: number,
		{ now = new Date(), maxVenues = Infinity }: { now?: Date; maxVenues?: number } = {},
	): ReservationPlan {
		const linked = venues.filter(v => reservationUrlOf(v)).length;
		const targets = this.targets(venues, city, maxVenues);
		const taken = [...targets.values()].reduce((n, list) => n + list.length, 0);
		const dates = comingWeekendEvenings(now, city.timezone);
		const thefork = targets.get(ReservationPlatformEnum.THEFORK) ?? [];
		const opentable = targets.get(ReservationPlatformEnum.OPENTABLE) ?? [];
		const paid = [thefork, opentable].filter(list => list.length).length;
		return {
			dates,
			venues: venues.length,
			noPlatform: venues.length - linked,
			capped: linked - taken,
			google: targets.get(ReservationPlatformEnum.GOOGLE) ?? [],
			thefork:
				thefork.length ?
					{ targets: thefork, call: this.theFork.call(thefork, budgetUsd / paid) }
				:	null,
			opentable: this.openTable.calls(opentable, dates, budgetUsd / paid),
		};
	}

	/**
	 * Google's own booking pages, fetched (free, paced): the samples written, with each venue's
	 * partner. A captcha or a failed load stops the fetch; the samples taken before it are kept
	 * and the error returned, so the run can fail once the other platforms are saved. Flushes.
	 */
	async sampleGoogle(
		targets: ReservationTarget[],
		dates: string[],
		now: Date,
	): Promise<{ found: number; error?: string }> {
		if (!targets.length) return { found: 0 };
		let found: ReservationAvailability[];
		let error: string | undefined;
		try {
			found = await this.google.availability(targets, dates);
		} catch (e) {
			found = e instanceof PartialAvailabilityError ? e.found : [];
			error = (e as Error).message;
			this.logger.error(`google availability failed: ${error}`);
		}
		await this.writeSamples(ReservationPlatformEnum.GOOGLE, found, now);
		await this.em.flush();
		return { found: found.length, ...(error && { error }) };
	}

	/**
	 * The paid runs' items read from their rows and written as samples (a failed run, `null`,
	 * contributes none); the samples per platform. Flushes.
	 */
	async saveSamples(
		plan: ReservationPlan,
		records: ReservationRecords,
		now: Date,
	): Promise<Record<string, number>> {
		const byPlatform: Record<string, number> = {};
		if (plan.thefork && records.thefork) {
			const items = await this.apifyService.storedItems<TheForkItem>(records.thefork);
			const found = this.theFork.read(plan.thefork.targets, items, plan.dates);
			await this.writeSamples(ReservationPlatformEnum.THEFORK, found, now);
			byPlatform[ReservationPlatformEnum.THEFORK] = found.length;
		}
		for (const [index, run] of plan.opentable.entries()) {
			const recordId = records.opentable[index];
			if (!recordId) continue;
			const items = await this.apifyService.storedItems<OpenTableItem>(recordId);
			const found = this.openTable.read(run, items);
			await this.writeSamples(ReservationPlatformEnum.OPENTABLE, found, now);
			byPlatform[ReservationPlatformEnum.OPENTABLE] =
				(byPlatform[ReservationPlatformEnum.OPENTABLE] ?? 0) + found.length;
		}
		await this.em.flush();
		return byPlatform;
	}

	/** One sample row per availability; every Google sample rewrites the partner, so a venue that moves platform updates */
	private async writeSamples(
		platform: ReservationPlatformEnum,
		found: ReservationAvailability[],
		now: Date,
	): Promise<void> {
		const venues = await this.em.find(Venue, {
			id: { $in: _.uniq(found.map(a => a.venueId)) },
		});
		const byId = new Map(venues.map(v => [v.id, v]));
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
			if (a.partner !== undefined) venue.reservationPartner = a.partner;
		}
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
	async between(
		venueIds: string | string[],
		fromDate: string,
		toDate: string,
	): Promise<VenueReservationSample[]> {
		if (Array.isArray(venueIds) && venueIds.length === 0) return [];
		return this.em.find(
			VenueReservationSample,
			{
				venue: Array.isArray(venueIds) ? { $in: venueIds } : venueIds,
				forDate: { $gte: fromDate, $lt: toDate },
			},
			{ orderBy: { forDate: QueryOrder.ASC, sampledAt: QueryOrder.ASC } },
		);
	}

	/**
	 * How booked out every venue of a city sampled on these evenings was, one row per venue and
	 * evening (its latest sample), with the venue's district: what district and city medians are
	 * taken over. One query. `excludeVenueId` leaves the venue being compared out.
	 */
	async cityEvenings(
		cityId: string,
		dates: string[],
		excludeVenueId?: string,
	): Promise<CityEveningBooked[]> {
		if (dates.length === 0) return [];
		const rows: {
			venue_id: string;
			district: string | null;
			for_date: string;
			booked: number;
		}[] = await this.em.getConnection().execute(
			`select distinct on (s.venue_id, s.for_date)
					s.venue_id, v.district, s.for_date,
					(1 - least(s.slots_open, s.slots_asked)::float / s.slots_asked) * 100 as booked
				from venue_reservation_samples s join venues v on v.id = s.venue_id
				where v.city_id = ? and s.slots_asked > 0 and s.for_date in (${dates.map(() => '?').join(', ')})
					${excludeVenueId ? 'and v.id <> ?' : ''}
				order by s.venue_id, s.for_date, s.sampled_at desc`,
			[cityId, ...dates, ...(excludeVenueId ? [excludeVenueId] : [])],
		);
		return rows.map(r => ({
			venueId: r.venue_id,
			district: r.district,
			forDate: r.for_date,
			booked: Number(r.booked),
		}));
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
