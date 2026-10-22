import type { CityMonthContextOutputDto } from 'src/modules/cities/dto/admin-city-day.output.dto.js';

/** The posts by others about a venue in a month (its own account's never count). */
export interface PortalSeriesSocialOutputDto {
	posts: number;
	views: number;
	creators: number;
	engagements: number;
	/** Absent for a month read from the next report's look back */
	sentiment?: { positive: number; mixed: number; neutral: number; negative: number };
}

/** The month's Google reviews. */
export interface PortalSeriesReviewsOutputDto {
	count: number;
	/** Reviews with text: what topic shares are out of */
	written: number;
	avgStars?: number;
	/** 0–1 */
	replyRate?: number;
}

/** Topic → how many written reviews raised it that month (a review counts once per topic). */
export interface PortalSeriesTopicsOutputDto {
	praise: Record<string, number>;
	complaints: Record<string, number>;
}

/** One competitor's same month, from the venue's report. */
export interface PortalSeriesCompetitorOutputDto {
	venueId: string;
	name: string;
	posts: number;
	views: number;
	creators: number;
	/** False when we don't scrape its reviews: the review fields are then unknown, not zero */
	reviewsTracked: boolean;
	reviews?: number;
	avgStars?: number;
	replyRate?: number;
	/** All-time Google rating as of the report */
	rating?: number;
	/** Its Friday and Saturday evenings booked out that month (0–100); absent without samples */
	booked?: number;
}

/**
 * The month's busyness: the mean busyness index (the week's ten busiest hours of Google's popular
 * times, 0–100) over the month's samples, and the busiest hour of their mean histogram.
 */
export interface PortalSeriesBusynessOutputDto {
	index: number;
	samples: number;
	/** `Mo` … `Su` */
	peakDay?: string;
	peakHour?: number;
}

/** One own account at a month's close (`SocialAccountSnapshot`). */
export interface PortalSeriesOwnAccountOutputDto {
	platform: 'tiktok' | 'instagram';
	handle: string;
	followers?: number;
	/** Everything the profile shows */
	posts?: number;
	/** Over its latest posts, ten at most */
	avgViews?: number;
}

/** One month of the venue's series. `null` where the month has no data. */
export interface PortalSeriesMonthOutputDto {
	/** `YYYY-MM` */
	month: string;
	/** The month's report, to open from the chart; null when there is none */
	reportId: string | null;
	social: PortalSeriesSocialOutputDto | null;
	reviews: PortalSeriesReviewsOutputDto | null;
	topics: PortalSeriesTopicsOutputDto | null;
	/** The month's most talked-about dishes, most first, eight at most */
	dishes: { name: string; count: number }[] | null;
	/** All-time Google rating and review count at the close of the month */
	rating: number | null;
	reviewsCount: number | null;
	/** The competitors picked that month; empty when none were */
	competitors: PortalSeriesCompetitorOutputDto[];
	/** Google popular times sampled in the month; absent when none were (not tracked, or no popular times) */
	busyness?: PortalSeriesBusynessOutputDto;
	/** The venue's own accounts as scraped at the month's close; absent when none was */
	ownAccounts?: PortalSeriesOwnAccountOutputDto[];
	/** Its Friday and Saturday evenings booked out (0–100), the month's mean; absent without samples */
	booked?: number;
	/**
	 * The median booked-out share of the other venues of its district sampled on its evenings that
	 * month; absent without its own samples or below 5 venues
	 */
	districtBooked?: number;
}

/** A branch the portal's place charts can show. */
export interface PortalBranchChoiceOutputDto {
	id: string;
	name: string;
	street?: string;
}

export interface PortalSeriesOutputDto {
	/** Oldest first, one row per month, months without a report included */
	months: PortalSeriesMonthOutputDto[];
	/** Every competitor that appears in the window, by name: the charts' faint lines */
	competitors: { venueId: string; name: string }[];
	/** The city's weather, holidays and events per month, same months: the charts' bands */
	calendar: CityMonthContextOutputDto[];
	/** The open branches the place figures (rating, busyness, open tables) can be of */
	branches: PortalBranchChoiceOutputDto[];
	/** The branch they are of; absent without one */
	branchId?: string;
}
