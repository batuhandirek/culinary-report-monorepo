import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	OPENTABLE_ACTOR,
	type OpenTableInput,
	type OpenTableItem,
	type OpenTableSlot,
} from 'src/modules/apify/actors/opentable.actor.js';

import { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';
import type {
	ReservationAvailability,
	ReservationTarget,
} from '../interfaces/reservation-availability.interface.js';
import { EVENING_SLOTS, openSlotsAtTimes, RESERVATION_PARTY_SIZE } from '../util/reservations.js';
import { isSameVenue } from '../util/venue-names.js';

// The middle of the evening window: OpenTable answers with slots around the asked time
const OPENTABLE_ASK_TIME = '20:00';

/** OpenTable's domain for a profile link: `opentable.de` → `de`, `opentable.co.uk` → `co.uk`. */
const openTableCountry = (url: string): string => {
	try {
		return new URL(url).hostname.replace(/^.*?opentable\./, '') || 'com';
	} catch {
		return 'com';
	}
};

const addMinutes = (time: string, minutes: number): string => {
	const [h, m] = time.split(':').map(Number);
	const total = h * 60 + m + minutes;
	return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** The bookable start times (`HH:MM`) of one row's slots on `forDate`. */
export const openTableTimes = (slots: OpenTableSlot[], forDate: string): string[] =>
	slots.flatMap(slot => {
		if (typeof slot === 'string') return [slot.includes('T') ? slot.split('T')[1] : slot];
		if (slot.isAvailable === false) return [];
		if (slot.availableDate && slot.availableDate !== forDate) return [];
		if (slot.time) return [slot.time];
		if (slot.dateTime) return [slot.dateTime.split('T')[1] ?? ''];
		if (slot.timeOffsetMinutes !== undefined)
			return [addMinutes(OPENTABLE_ASK_TIME, slot.timeOffsetMinutes)];
		return [];
	});

/** One OpenTable run: the targets on one domain, for one date */
export interface OpenTableRun {
	country: string;
	date: string;
	targets: ReservationTarget[];
	call: ActorCall<OpenTableInput, OpenTableItem>;
}

/**
 * OpenTable availability for two at 20:00 through the actor's `ga` process, which finds a
 * restaurant by its exact name. One run per date and OpenTable domain; each run is charged at
 * least 1,000 result units (~$0.26), so venues are batched into one run. The runs are children
 * of the `sample-reservations` run: `calls` is what it starts, `read` what it makes of a run's
 * stored items.
 */
@Injectable()
export class OpenTableAvailabilityService {
	readonly platform = ReservationPlatformEnum.OPENTABLE;

	/** One run per domain and date, the budget split evenly over them */
	calls(targets: ReservationTarget[], dates: string[], budgetUsd: number): OpenTableRun[] {
		if (targets.length === 0 || dates.length === 0) return [];
		const groups = Object.entries(_.groupBy(targets, t => openTableCountry(t.url)));
		const perRun = budgetUsd / (groups.length * dates.length);
		return groups.flatMap(([country, group]) =>
			dates.map(date => ({
				country,
				date,
				targets: group,
				call: {
					actor: OPENTABLE_ACTOR,
					input: {
						process: 'ga' as const,
						queries: group.map(t => `${t.name}, ${t.cityName}`),
						date,
						time: OPENTABLE_ASK_TIME,
						people: RESERVATION_PARTY_SIZE,
						country,
						maximum: 1,
						maxResults: group.length,
					},
					maxCostUsd: perRun,
					purpose: `opentable availability ${date}: ${group.length} venues`,
				},
			})),
		);
	}

	read(run: OpenTableRun, items: OpenTableItem[]): ReservationAvailability[] {
		return openTableAvailability(run.targets, items, run.date);
	}
}

/** Matches OpenTable rows to the targets by name and counts the evening's open slots. */
export const openTableAvailability = (
	targets: ReservationTarget[],
	items: OpenTableItem[],
	forDate: string,
): ReservationAvailability[] => {
	const rows = items.filter(i => i.name && Array.isArray(i.slots));
	return targets.flatMap(target => {
		const row = rows.find(i => isSameVenue(i.name!, target.name));
		if (!row) return [];
		return [
			{
				venueId: target.venueId,
				forDate,
				slotsOpen: openSlotsAtTimes(openTableTimes(row.slots!, forDate)),
				slotsAsked: EVENING_SLOTS,
				partySize: RESERVATION_PARTY_SIZE,
			},
		];
	});
};
