import type { CityHighlightData } from '../interfaces/city-highlight.interface.js';

/** The city as the public page names it. */
export interface CityHighlightCityOutputDto {
	slug: string;
	name: string;
}

/** A published month of a city: what `/<city>/<month>` renders. */
export interface CityHighlightOutputDto {
	month: string;
	city: CityHighlightCityOutputDto;
	data: CityHighlightData;
	builtAt: Date;
	publishedAt: Date;
	updatedAt: Date;
}

/** A month as the admin page shows it: published or not. */
export interface AdminCityHighlightOutputDto {
	id: string;
	month: string;
	city: CityHighlightCityOutputDto & { id: string };
	data: CityHighlightData;
	builtAt: Date;
	publishedAt?: Date;
	updatedAt: Date;
}

export interface AdminCityHighlightMonthOutputDto {
	month: string;
	builtAt: Date;
	publishedAt?: Date;
}

export interface AdminCityHighlightsOutputDto {
	/** The asked month, when it was built */
	highlight?: AdminCityHighlightOutputDto;
	/** Every built month of the city, newest first */
	months: AdminCityHighlightMonthOutputDto[];
}
