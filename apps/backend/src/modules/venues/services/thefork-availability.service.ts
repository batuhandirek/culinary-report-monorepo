import { Injectable } from '@nestjs/common';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	THEFORK_ACTOR,
	type TheForkInput,
	type TheForkItem,
} from 'src/modules/apify/actors/thefork.actor.js';

import { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';
import type {
	ReservationAvailability,
	ReservationTarget,
} from '../interfaces/reservation-availability.interface.js';
import { EVENING_SLOTS, openSlotsInIntervals } from '../util/reservations.js';
import { isSameVenue } from '../util/venue-names.js';

/** TheFork's restaurant id, the `r12345` that ends its URLs. */
const theForkId = (url: string | undefined): string | null =>
	/-r(\d+)(?:[/?#]|$)/.exec(url ?? '')?.[1] ?? null;

/**
 * TheFork availability from its restaurant pages (`startUrls`), reviews and photos off
 * (~$0.006 a restaurant). `bookable_intervals` covers the next seven days and carries no party
 * size; a date the platform lists with no window counts as fully booked, a date it doesn't
 * list is not sampled. The run is a child of the `sample-reservations` run: `call` is what it
 * starts, `read` what it makes of the stored items.
 */
@Injectable()
export class TheForkAvailabilityService {
	readonly platform = ReservationPlatformEnum.THEFORK;

	/** One run for every target, capped at the platform's share of the budget */
	call(targets: ReservationTarget[], budgetUsd: number): ActorCall<TheForkInput, TheForkItem> {
		return {
			actor: THEFORK_ACTOR,
			input: {
				startUrls: targets.map(t => t.url),
				maxRestaurants: targets.length,
				maxReviews: 0,
				maxPhotos: 0,
				language: 'en',
			},
			maxCostUsd: budgetUsd,
			purpose: `thefork availability: ${targets.length} venues`,
		};
	}

	read(
		targets: ReservationTarget[],
		items: TheForkItem[],
		dates: string[],
	): ReservationAvailability[] {
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
