import { tags } from 'typia';

import { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';

import { CitySourceKindEnum } from '../entities/city-source.entity.js';

export interface AdminCityDistrictInputDto {
	name: string & tags.MinLength<1> & tags.MaxLength<100>;
	postalCodes: (string & tags.MaxLength<20>)[];
	neighbours: (string & tags.MaxLength<100>)[];
}

export interface AdminCreateCityInputDto {
	slug: string & tags.Pattern<'^[a-z0-9]+(-[a-z0-9]+)*$'> & tags.MaxLength<60>;
	name: string & tags.MinLength<1> & tags.MaxLength<100>;
	aliases?: (string & tags.MaxLength<100>)[];
	/** ISO 3166-1 alpha-2, e.g. DE */
	country: string & tags.Pattern<'^[A-Z]{2}$'>;
	/** ISO 3166-2 subdivision, e.g. DE-BE: regional holidays and the Google Trends region */
	region?: (string & tags.Pattern<'^[A-Z]{2}-[A-Z0-9]{1,3}$'>) | null;
	/** IANA time zone, e.g. Europe/Berlin */
	timezone: string & tags.MinLength<1> & tags.MaxLength<60>;
	/** ISO 639-1, e.g. de: the reports' and outreach's language */
	language: string & tags.Pattern<'^[a-z]{2}$'>;
	/** Google Maps location, e.g. "Berlin, Germany" */
	locationQuery: string & tags.MinLength<1> & tags.MaxLength<200>;
	/** TikTok search region, ISO-2 */
	tiktokRegion: string & tags.Pattern<'^[A-Z]{2}$'>;
	/** The city's boundary on OpenStreetMap, a relation id (Berlin: 62422): the OSM place checklist */
	osmRelationId?: (number & tags.Type<'uint32'> & tags.Minimum<1>) | null;
	instagramEnabled?: boolean;
	lat?: (number & tags.Minimum<-90> & tags.Maximum<90>) | null;
	lng?: (number & tags.Minimum<-180> & tags.Maximum<180>) | null;
	districts?: AdminCityDistrictInputDto[];
	nameStopwords?: (string & tags.MaxLength<60>)[];
	chainDenyList?: (string & tags.MaxLength<100>)[];
	/** Venues who asked to be left out of public pages (names) */
	doNotListVenues?: (string & tags.MaxLength<100>)[];
	/** Creators who asked to be left out of public pages (handles, with or without @) */
	doNotListCreators?: (string & tags.MaxLength<100>)[];
	stepBudgetsUsd?: Partial<Record<PipelineStepEnum, number & tags.Minimum<0> & tags.Maximum<100>>>;
	/** Days between two dish-search snapshots (every dish × district); 0 turns them off */
	dishSearchEveryDays?: number & tags.Type<'uint32'> & tags.Maximum<365>;
	topBrands?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<200>;
	cronEnabled?: boolean;
	active?: boolean;
}

export interface AdminUpdateCityInputDto extends Partial<AdminCreateCityInputDto> {}

export interface AdminAddCitySourceInputDto {
	kind: CitySourceKindEnum;
	/** A hashtag (with or without #), a search query, a blog's URL (the site, a section or its feed), or an account's handle (with or without @, or its profile URL) */
	value: string & tags.MinLength<1> & tags.MaxLength<500>;
	note?: string & tags.MaxLength<500>;
	enabled?: boolean;
}

export interface AdminUpdateCitySourceInputDto {
	enabled?: boolean;
	note?: (string & tags.MaxLength<500>) | null;
}

export interface AdminSuggestCitySourcesInputDto {
	/** What the city eats, for the searches, e.g. "known for döner, Vietnamese, brunch" */
	cuisineNotes?: string & tags.MaxLength<1000>;
}
