import type { DeliveryPlatformEnum } from '../entities/venue-delivery-listing.entity.js';
import type { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';
import type { PopularTimesHistogram } from '../interfaces/venue-details.interface.js';

/** One twice-weekly sample of Google popular times. */
export interface AdminVenueBusynessSampleOutputDto {
	id: number;
	sampledAt: Date;
	/** Absent when Google showed no popular times that day */
	histogram?: PopularTimesHistogram;
	/** Mean of the week's ten busiest hours, 0–100 */
	busynessIndex?: number;
	livePercent?: number;
	liveText?: string;
}

/** Open evening slots on a booking platform for one date. */
export interface AdminVenueReservationSampleOutputDto {
	id: number;
	platform: ReservationPlatformEnum;
	sampledAt: Date;
	forDate: string;
	slotsOpen: number;
	slotsAsked: number;
	partySize?: number;
}

export interface AdminVenueDeliveryListingOutputDto {
	id: string;
	platform: DeliveryPlatformEnum;
	url: string;
	rating?: number;
	reviewsCount?: number;
	deliveryFee?: number;
	minOrder?: number;
	currency?: string;
	fetchedAt: Date;
	/** The latest month with a stored menu, and how many dishes it has */
	menuMonth?: string;
	menuItems: number;
}

/** What the demand samples and delivery scrapes stored for a venue, newest first. */
export interface AdminVenueDemandOutputDto {
	busyness: AdminVenueBusynessSampleOutputDto[];
	reservations: AdminVenueReservationSampleOutputDto[];
	delivery: AdminVenueDeliveryListingOutputDto[];
}
