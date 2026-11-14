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

export interface AdminListBrandSuggestionsInputDto {
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminSearchBrandsInputDto {
	/** On the brand's name or any of its branches' */
	q: string & tags.MinLength<1> & tags.MaxLength<120>;
	/** Left out of the results: the brand the search is made from */
	excludeId?: string & tags.Format<'uuid'>;
}

export interface AdminMergeBrandInputDto {
	/** The brand merged into this one and deleted */
	brandId: string & tags.Format<'uuid'>;
	/** The merged brand's name; this brand's without */
	name?: string & tags.MinLength<1> & tags.MaxLength<120>;
}
