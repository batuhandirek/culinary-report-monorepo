import type { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';

/** A venue to ask a booking platform about: its page there when we know it, its name always. */
export interface ReservationTarget {
	venueId: string;
	name: string;
	url: string;
	/** The city's name, for platforms searched by name */
	cityName: string;
	/** The city's time zone, for platforms asked by the instant of a local time */
	timeZone: string;
}

/** Open evening slots for one venue and date. */
export interface ReservationAvailability {
	venueId: string;
	forDate: string;
	slotsOpen: number;
	slotsAsked: number;
	/** Null where the platform's availability doesn't depend on a party size */
	partySize: number | null;
	/** The platform behind the page, where the page names one (Google's own booking page) */
	partner?: string | null;
}

/** A provider stopped part-way: the samples it took before stopping are kept, then the run fails. */
export class PartialAvailabilityError extends Error {
	constructor(
		message: string,
		readonly found: ReservationAvailability[],
	) {
		super(message);
	}
}

/**
 * The free booking source, Google's own booking page, fetched in a step of the
 * `sample-reservations` run; the paid platforms (TheFork, OpenTable) are actor runs the run starts
 * as children, their services handing it the calls (`TheForkAvailabilityService.call`,
 * `OpenTableAvailabilityService.calls`) and reading the stored items. A platform whose only access
 * is an API its terms reserve for partners gets no implementation.
 */
export interface ReservationAvailabilityProvider {
	readonly platform: ReservationPlatformEnum;
	/** Costs nothing per call: left out of the budget split */
	readonly free?: boolean;
	availability(targets: ReservationTarget[], dates: string[]): Promise<ReservationAvailability[]>;
}
