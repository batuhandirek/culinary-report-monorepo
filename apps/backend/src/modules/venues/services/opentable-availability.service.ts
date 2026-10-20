import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';

import { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';
import type {
	ReservationAvailability,
	ReservationAvailabilityProvider,
	ReservationTarget,
} from '../interfaces/reservation-availability.interface.js';
import { EVENING_SLOTS, openSlotsAtTimes, RESERVATION_PARTY_SIZE } from '../util/reservations.js';
import { isSameVenue } from '../util/venue-names.js';

const OPENTABLE_ACTOR = 'canadesk/opentable';
// The middle of the evening window: OpenTable answers with slots around the asked time
const OPENTABLE_ASK_TIME = '20:00';

/** A slot as the actor may send it: a time, a local date-time, or an offset from the asked time. */
export type OpenTableSlot =
	| string
	| {
			time?: string;
			dateTime?: string;
			availableDate?: string;
			timeOffsetMinutes?: number;
			isAvailable?: boolean;
	  };

/** The `canadesk/opentable` availability row (`process: "ga"`): one per restaurant and day. */
export interface OpenTableItem {
	rowType?: string;
	name?: string;
	restaurantId?: string | number;
	slots?: OpenTableSlot[] | null;
	// The actor's placeholder rows (minimum-charge units) carry a message and no restaurant
	message?: string;
	code?: string;
}

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
		if (slot.timeOffsetMinutes !== undefined) return [addMinutes(OPENTABLE_ASK_TIME, slot.timeOffsetMinutes)];
		return [];
	});

/**
 * OpenTable availability for two at 20:00 through the actor's `ga` process, which finds a
 * restaurant by its exact name. One run per date and OpenTable domain; each run is charged at
 * least 1,000 result units (~$0.26), so venues are batched into one run.
 */
@Injectable()
export class OpenTableAvailabilityService implements ReservationAvailabilityProvider {
	readonly platform = ReservationPlatformEnum.OPENTABLE;

	constructor(private readonly apifyService: ApifyService) {}

	async availability(
		targets: ReservationTarget[],
		dates: string[],
		budgetUsd: number,
	): Promise<ReservationAvailability[]> {
		if (targets.length === 0 || dates.length === 0) return [];
		const groups = Object.entries(_.groupBy(targets, t => openTableCountry(t.url)));
		const perRun = budgetUsd / (groups.length * dates.length);
		const out: ReservationAvailability[] = [];
		for (const [country, group] of groups)
			for (const date of dates) {
				const items = await this.apifyService.runActor<OpenTableItem>(
					OPENTABLE_ACTOR,
					{
						process: 'ga',
						queries: group.map(t => `${t.name}, ${t.cityName}`),
						date,
						time: OPENTABLE_ASK_TIME,
						people: RESERVATION_PARTY_SIZE,
						country,
						maximum: 1,
						maxResults: group.length,
					},
					{ maxCostUsd: perRun, purpose: `opentable availability ${date}: ${group.length} venues` },
				);
				out.push(...openTableAvailability(group, items, date));
			}
		return out;
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
