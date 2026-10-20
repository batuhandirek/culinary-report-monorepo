import { tags } from 'typia';

import type { BrandReportScopeEnum } from '../entities/brand.entity.js';

export interface AdminConfirmBrandInputDto {
	name: string & tags.MinLength<1> & tags.MaxLength<120>;
	/** Its branches: their brands are merged into one */
	venueIds: (string & tags.Format<'uuid'>)[] & tags.MinItems<1>;
}

export interface AdminUpdateBrandInputDto {
	name?: string & tags.MinLength<1> & tags.MaxLength<120>;
	/** One report per city, or one across all its cities */
	reportScope?: BrandReportScopeEnum;
}

export interface AdminDismissBrandInputDto {
	/** The suggestion's name and key, as `listBrandSuggestions` gave them */
	name: string & tags.MaxLength<120>;
	key: string & tags.MinLength<1> & tags.MaxLength<120>;
}

export interface AdminBrandVenuesInputDto {
	venueIds: (string & tags.Format<'uuid'>)[] & tags.MinItems<1>;
}

export interface AdminBrandVenueInputDto {
	venueId: string & tags.Format<'uuid'>;
}

export interface AdminSearchBrandInputDto {
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminListBrandSuggestionsInputDto {
	cityId: string & tags.Format<'uuid'>;
}
