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
 * One booking platform's availability source. A paid one runs an Apify actor through
 * `ApifyService.runActor` (so the cost cap holds) and shares the step's budget with the other
 * paid ones; a `free` one (Google's booking page, fetched) takes no budget. A platform whose only
 * access is an API its terms reserve for partners gets no implementation.
 */
export interface ReservationAvailabilityProvider {
	readonly platform: ReservationPlatformEnum;
	/** Costs nothing per call: left out of the budget split */
	readonly free?: boolean;
	availability(
		targets: ReservationTarget[],
		dates: string[],
		budgetUsd: number,
	): Promise<ReservationAvailability[]>;
}
