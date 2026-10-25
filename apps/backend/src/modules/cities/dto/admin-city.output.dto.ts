import { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';

import { CitySourceKindEnum } from '../entities/city-source.entity.js';
import type { CityDistrict } from '../interfaces/city-district.interface.js';

/** A city as a filter or a select offers it. */
export interface AdminCityRefOutputDto {
	id: string;
	slug: string;
	name: string;
}

export interface AdminCityOutputDto extends AdminCityRefOutputDto {
	createdAt: Date;
	updatedAt: Date;
	aliases: string[];
	country: string;
	region?: string;
	timezone: string;
	language: string;
	locationQuery: string;
	tiktokRegion: string;
	osmRelationId?: number;
	instagramEnabled: boolean;
	lat?: number;
	lng?: number;
	districts: CityDistrict[];
	nameStopwords: string[];
	chainDenyList: string[];
	doNotListVenues: string[];
	doNotListCreators: string[];
	stepBudgetsUsd: Partial<Record<PipelineStepEnum, number>>;
	topBrands: number;
	cronEnabled: boolean;
	active: boolean;
}

export interface AdminCityListItemOutputDto extends AdminCityRefOutputDto {
	createdAt: Date;
	country: string;
	language: string;
	active: boolean;
	cronEnabled: boolean;
	instagramEnabled: boolean;
	/** For district filters across cities */
	districts: CityDistrict[];
	venues: number;
	sources: number;
	enabledSources: number;
}

export interface AdminListCitiesOutputDto {
	items: AdminCityListItemOutputDto[];
}

export interface AdminCitySourceOutputDto {
	id: string;
	createdAt: Date;
	kind: CitySourceKindEnum;
	value: string;
	enabled: boolean;
	/** Added by the suggestion agent and not reviewed yet */
	suggested: boolean;
	note?: string;
	/** A blog's feed, once `SCRAPE_BLOGS` found it */
	feedUrl?: string;
	/** When `SCRAPE_BLOGS` last read the blog, and what went wrong then */
	checkedAt?: Date;
	error?: string;
}

/** A source with what it brought in over the last three months. */
export interface AdminCitySourceYieldOutputDto extends AdminCitySourceOutputDto {
	/** Posts it found, whichever source found them too */
	posts: number;
	/** Of those, posts with a matched mention */
	matchedPosts: number;
	/** Matched posts no other enabled source, venue search or watched brand profile found: what turning it off loses */
	uniqueMatchedPosts: number;
	views: number;
}

export interface AdminListCitySourcesOutputDto {
	items: AdminCitySourceYieldOutputDto[];
	/**
	 * The day every source that finds a post is recorded (YYYY-MM-DD): before it a post kept only
	 * its first source, so unique counts over a window starting earlier are too high
	 */
	allFindsSince: string;
}

/** A tag the city doesn't scrape that keeps coming up on its matched posts. */
export interface AdminCityHashtagSuggestionOutputDto {
	hashtagId: number;
	tag: string;
	/** The source it would be */
	kind: CitySourceKindEnum;
	matchedPosts: number;
	brands: number;
	sampleBrands: string[];
}

export interface AdminCityHashtagSuggestionsOutputDto {
	items: AdminCityHashtagSuggestionOutputDto[];
}

export interface AdminSuggestCitySourcesOutputDto {
	/** The suggestions added, disabled */
	items: AdminCitySourceOutputDto[];
	/** Suggestions the city already had */
	skipped: number;
}

/** A district as the venue scrape suggests it. */
export interface AdminSuggestedDistrictOutputDto extends CityDistrict {
	venues: number;
	isNew: boolean;
}

export interface AdminCityDistrictSuggestionsOutputDto {
	items: AdminSuggestedDistrictOutputDto[];
}
