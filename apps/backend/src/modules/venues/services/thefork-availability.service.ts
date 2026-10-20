import { Injectable } from '@nestjs/common';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';

import { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';
import type {
	ReservationAvailability,
	ReservationAvailabilityProvider,
	ReservationTarget,
} from '../interfaces/reservation-availability.interface.js';
import { EVENING_SLOTS, openSlotsInIntervals } from '../util/reservations.js';
import { isSameVenue } from '../util/venue-names.js';

const THEFORK_ACTOR = 'clearpath/thefork-scraper';

/** The `clearpath/thefork-scraper` fields we read (one item per restaurant, 100+ fields). */
export interface TheForkItem {
	id?: string | number;
	url?: string;
	name?: string;
	is_bookable?: boolean;
	// The next seven days' bookable windows, minutes after midnight, both ends bookable
	bookable_intervals?: { date: string; isToday?: boolean; intervals: { start: number; end: number }[] }[] | null;
}

/** TheFork's restaurant id, the `r12345` that ends its URLs. */
const theForkId = (url: string | undefined): string | null => /-r(\d+)(?:[/?#]|$)/.exec(url ?? '')?.[1] ?? null;

/**
 * TheFork availability from its restaurant pages (`startUrls`), reviews and photos off
 * (~$0.006 a restaurant). `bookable_intervals` covers the next seven days and carries no party
 * size; a date the platform lists with no window counts as fully booked, a date it doesn't
 * list is not sampled.
 */
@Injectable()
export class TheForkAvailabilityService implements ReservationAvailabilityProvider {
	readonly platform = ReservationPlatformEnum.THEFORK;

	constructor(private readonly apifyService: ApifyService) {}

	async availability(
		targets: ReservationTarget[],
		dates: string[],
		budgetUsd: number,
	): Promise<ReservationAvailability[]> {
		if (targets.length === 0) return [];
		const items = await this.apifyService.runActor<TheForkItem>(
			THEFORK_ACTOR,
			{
				startUrls: targets.map(t => t.url),
				maxRestaurants: targets.length,
				maxReviews: 0,
				maxPhotos: 0,
				language: 'en',
			},
			{ maxCostUsd: budgetUsd, purpose: `thefork availability: ${targets.length} venues` },
		);
		return theForkAvailability(targets, items, dates);
	}
}

/** Matches TheFork items to the targets (by restaurant id, else by name) and reads the dates. */
export const theForkAvailability = (
	targets: ReservationTarget[],
	items: TheForkItem[],
	dates: string[],
): ReservationAvailability[] => {
	const out: ReservationAvailability[] = [];
	for (const target of targets) {
		const id = theForkId(target.url);
		const item =
			items.find(i => id && (String(i.id ?? '') === id || theForkId(i.url) === id)) ??
			items.find(i => i.name && isSameVenue(i.name, target.name));
		if (!item?.bookable_intervals) continue;
		for (const forDate of dates) {
			const day = item.bookable_intervals.find(d => d.date === forDate);
			if (!day) continue;
			out.push({
				venueId: target.venueId,
				forDate,
				slotsOpen: openSlotsInIntervals(day.intervals ?? []),
				slotsAsked: EVENING_SLOTS,
				partySize: null,
			});
		}
	}
	return out;
};
