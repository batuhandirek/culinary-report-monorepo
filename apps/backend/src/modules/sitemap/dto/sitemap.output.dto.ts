import { tags } from 'typia';

export interface SitemapSectionOutputDto {
	/** Lowercase letters only: it becomes part of the sitemap file name. */
	name: string;
	totalItems: number;
}

export interface SitemapSectionsOutputDto {
	items: SitemapSectionOutputDto[];
}

export interface SitemapEntryOutputDto {
	/** App path, e.g. `/reports/123`; the frontend prefixes its origin. */
	path: string;
	updatedAt: string;
}

export interface SitemapEntriesOutputDto {
	items: SitemapEntryOutputDto[];
	totalItems: number;
}

export interface SitemapPaginationInputDto {
	page: number & tags.Minimum<1>;
	size: number & tags.Minimum<1> & tags.Maximum<10000>;
}
