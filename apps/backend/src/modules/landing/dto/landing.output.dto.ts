import type { LandingCopy, LandingEditionData } from '../interfaces/landing-edition.interface.js';

/** The city as the front page names it. */
export interface LandingCityOutputDto {
	slug: string;
	name: string;
}

/** The newest published edition of a city's front page: what `/` renders. */
export interface LandingEditionOutputDto {
	city: LandingCityOutputDto;
	/** The counted window [windowStart, windowEnd) */
	windowStart: Date;
	windowEnd: Date;
	data: LandingEditionData;
	copy: LandingCopy;
	builtAt: Date;
	publishedAt: Date;
}

/** An edition as the admin lists it. */
export interface AdminLandingEditionSummaryOutputDto {
	id: string;
	windowStart: Date;
	windowEnd: Date;
	builtAt: Date;
	publishedAt?: Date;
	/** Why every line fell back, when the model's call failed */
	copyError?: string;
}

export interface AdminLandingEditionsOutputDto {
	editions: AdminLandingEditionSummaryOutputDto[];
	/** The edition `/` shows now, if any */
	liveId?: string;
}

/** One edition, published or not, with everything it shows. */
export interface AdminLandingEditionOutputDto extends AdminLandingEditionSummaryOutputDto {
	city: LandingCityOutputDto & { id: string };
	data: LandingEditionData;
	copy: LandingCopy;
}
