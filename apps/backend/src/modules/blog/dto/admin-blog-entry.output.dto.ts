import { BlogEntryStateEnum } from '../constants/blog-entry-state.enum.constant.js';

import { BlogEntryCoverImageOutputDto } from './blog-entry.output.dto.js';
import { BlogTagOutputDto } from './blog-tag.output.dto.js';

export interface AdminBlogEntryAuthorOutputDto {
	id: string;
	firstName: string;
	lastName: string;
	publicName: string;
}

export interface AdminBlogEntryOutputDto {
	id: string;
	slug: string;
	title: string;
	excerpt?: string | null;
	content: string;
	state: BlogEntryStateEnum;
	publishedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
	viewCount: number;
	coverImage?: BlogEntryCoverImageOutputDto;
	author?: AdminBlogEntryAuthorOutputDto;
	tags?: BlogTagOutputDto[];
}
