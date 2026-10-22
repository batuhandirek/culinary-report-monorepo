import type { FoodTrendsData, FoodTrendsSearchPull } from '../interfaces/food-trends.interface.js';

/** The city as the public page names it. */
export interface FoodTrendsCityOutputDto {
	slug: string;
	name: string;
}

/** A published quarter of a city: what `/<city>/trends/<YYYY>-q<N>` renders. */
export interface FoodTrendsReportOutputDto {
	quarter: string;
	city: FoodTrendsCityOutputDto;
	data: FoodTrendsData;
	builtAt: Date;
	publishedAt: Date;
	updatedAt: Date;
}

/** A quarter as the admin page shows it: pulled, built, published or not. */
export interface AdminFoodTrendsReportOutputDto {
	id: string;
	quarter: string;
	city: FoodTrendsCityOutputDto & { id: string };
	/** Absent until built */
	data?: FoodTrendsData;
	builtAt?: Date;
	publishedAt?: Date;
	/** The anchored search pull's state; absent when none was asked for */
	searchPull?: FoodTrendsSearchPull;
	updatedAt: Date;
}

export interface AdminFoodTrendsQuarterOutputDto {
	quarter: string;
	builtAt?: Date;
	publishedAt?: Date;
}

export interface AdminFoodTrendsOutputDto {
	/** The asked quarter, when anything is stored for it */
	report?: AdminFoodTrendsReportOutputDto;
	/** Every stored quarter of the city, newest first */
	quarters: AdminFoodTrendsQuarterOutputDto[];
	/** What an anchored pull would compare and roughly cost */
	pull: { topics: number; groups: number; estimatedUsd: number };
}
