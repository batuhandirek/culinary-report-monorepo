// The report's demand and price sections: computed at build from the samples and listings the
// pipeline stores (`VenueBusyness`, `VenueReservationSample`, `VenueDeliveryListing` /
// `MenuItem`) and from the report's own posts and reviews. Every field is optional on
// `ReportData`: absent means not tracked or below its floors, never zero.

import type { DishPrice, TopicPrice } from 'src/modules/venues/util/delivery.js';

import type { BuzzToReviews, ComplaintTimes, PaidVsOrganic } from '../util/correlations.js';

/** Google's busiest hour, from the mean of the month's samples. */
export interface ReportPeakHour {
	/** `Mo` … `Su` */
	day: string;
	hour: number;
	percent: number;
}

/** One week (by its Monday, city time) of the month. */
export interface ReportBusynessWeek {
	week: string;
	/** Mean busyness index of the week's samples; absent when none had popular times */
	index?: number;
	/** Posts by others and their views that week (the report month only) */
	posts?: number;
	views?: number;
	/** How booked out the sampled evenings were, 0–100; absent when not sampled */
	booked?: number;
}

/** "Did the buzz fill the place?": Google popular times sampled twice a week. */
export interface ReportBusyness {
	/** The month's weeks, first to last */
	weeks: ReportBusynessWeek[];
	/** Mean busyness index (the week's ten busiest hours, 0–100) over the month's samples */
	index: number;
	samples: number;
	peak?: ReportPeakHour;
	/** Mean of the live percent where Google showed one at sampling (19:00 local) */
	livePercent?: number;
	/** The month before, the same way; absent when it had no sample with popular times */
	previous?: {
		month: string;
		weeks: ReportBusynessWeek[];
		index: number;
		samples: number;
		peak?: ReportPeakHour;
	};
}

/** Open tables on a booking platform for Friday and Saturday evenings. */
export interface ReportDemand {
	/** `google` (Google's own booking page), `thefork` or `opentable` */
	platform: string;
	/** The platform behind Google's booking page ("OpenTable"), when the page names one */
	partner?: string;
	/** Mean share of closed evening slots over the month's sampled evenings, 0–100 */
	booked: number;
	evenings: { date: string; booked: number }[];
	/** The month before, when sampled */
	previousBooked?: number;
	/**
	 * The median booked-out share of the other venues sampled in its district for the same
	 * evenings, and how many; absent below 5 venues
	 */
	district?: ReportBookedMedian;
	/** The same over the city */
	city?: ReportBookedMedian;
}

/** The median booked-out share (0–100) of a group of venues, and how many venues it covers. */
export interface ReportBookedMedian {
	median: number;
	venues: number;
}

/** The venue's (or a competitor's) page on a delivery platform. */
export interface ReportDeliveryListing {
	platform: string;
	url: string;
	rating?: number;
	reviewsCount?: number;
	deliveryFee?: number;
	minOrder?: number;
	currency?: string;
}

/** "Your prices next to your competitors'", and the delivery reputation. */
export interface ReportPrices {
	/** The venue's own listings, Wolt first */
	listings: ReportDeliveryListing[];
	/** Competitors' listings, for the delivery-reputation line */
	competitorListings: (ReportDeliveryListing & { name: string })[];
	/** From the venue's Wolt menu; absent without one */
	menu?: {
		platform: string;
		currency: string;
		/** The month the menu was read */
		month: string;
		/**
		 * Its primary food topic's items against the same on the other menus ("your ramen €14.50,
		 * theirs €12.90"), the line to lead with; `othersMedian` absent when no other menu has it.
		 * Absent when its menu has none of it
		 */
		topic?: TopicPrice;
		/** Median main course */
		median: number;
		/** Median of the other menus' medians (competitors, else venues of its district) */
		othersMedian?: number;
		othersWithMenu: number;
		/** Who the others are */
		othersAre: 'competitors' | 'district';
		/** `median / othersMedian - 1` */
		diff?: number;
		dishes: DishPrice[];
	};
	/** Share of written reviews criticising price, 0–1, against tracked competitors' median */
	priceComplaints?: { share: number; written: number; othersMedian?: number; others: number };
	/** The block's one-line read, for the prompt */
	sentence?: string;
}

/** The computed relations; each absent below its floors (10 reviews, 3 posts). */
export interface ReportCorrelations {
	buzzToReviews?: BuzzToReviews;
	complaintTimes?: ComplaintTimes;
	paidVsOrganic?: PaidVsOrganic;
}
