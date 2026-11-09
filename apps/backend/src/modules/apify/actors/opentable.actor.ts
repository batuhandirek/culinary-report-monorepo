import { defineActor } from './actor.js';

/**
 * `canadesk/opentable`, process `ga` (get availability): OpenTable's slots around a time, for a
 * party, on one date, per restaurant found by its **exact name** ("Name, City").
 *
 * - **Price.** Each run is charged at least 1,000 result units (~$0.26), so restaurants are
 *   batched into one run per date and OpenTable domain.
 * - **Odd rows.** The actor adds placeholder rows (the minimum-charge units) with a `message` and
 *   no restaurant.
 * - **Slot shapes.** A slot comes as a time, a local date-time, or an offset in minutes from the
 *   asked time (`OpenTableSlot`).
 */
export interface OpenTableInput {
	process: 'ga';
	/** "Name, City" a restaurant */
	queries: string[];
	/** `YYYY-MM-DD` */
	date: string;
	/** `HH:MM`: the slots come around it */
	time: string;
	people: number;
	/** OpenTable's domain: `de`, `co.uk`, `com` */
	country: string;
	maximum?: number;
	maxResults?: number;
}

/** A slot as the actor may send it: a time, a local date-time, or an offset from the asked time */
export type OpenTableSlot =
	| string
	| {
			time?: string;
			dateTime?: string;
			availableDate?: string;
			timeOffsetMinutes?: number;
			isAvailable?: boolean;
	  };

/** An availability row: one per restaurant and day */
export interface OpenTableItem {
	rowType?: string;
	name?: string;
	restaurantId?: string | number;
	slots?: OpenTableSlot[] | null;
	/** The actor's placeholder rows (minimum-charge units) carry a message and no restaurant */
	message?: string;
	code?: string;
}

export const OPENTABLE_ACTOR = defineActor<OpenTableInput, OpenTableItem>('canadesk/opentable');
