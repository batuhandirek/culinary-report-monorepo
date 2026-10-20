import { BlogEntryStateEnum } from '../constants/blog-entry-state.enum.constant.js';

import { BlogTagOutputDto } from './blog-tag.output.dto.js';

export interface BlogEntryAuthorOutputDto {
	id: string;
	publicName: string;
	profileImage?: {
		url: string;
		width: number;
		height: number;
		aspectRatio: number;
		fileName: string;
	};
}

export interface BlogEntryCoverImageOutputDto {
	url: string;
	width: number;
	height: number;
	aspectRatio: number;
	fileName: string;
}

/**
 * Lightweight entry shape for lists/cards — no `content` body.
 */
export interface BlogEntrySummaryOutputDto {
	id: string;
	slug: string;
	title: string;
	excerpt?: string | null;
	state: BlogEntryStateEnum;
	publishedAt?: Date | null;
	createdAt: Date;
	viewCount: number;
	coverImage?: BlogEntryCoverImageOutputDto;
	author?: BlogEntryAuthorOutputDto;
	tags?: BlogTagOutputDto[];
}

/**
 * Full entry shape for the detail page — carries the server-rendered `contentHtml` (the public
 * page renders it via `{@html}`). The raw JSON `content` is admin-only (editor).
 */
export interface BlogEntryOutputDto extends BlogEntrySummaryOutputDto {
	contentHtml: string;
}
