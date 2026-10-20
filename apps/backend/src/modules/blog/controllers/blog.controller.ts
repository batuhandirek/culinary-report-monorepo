import { Controller } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import { BlogEntryOutputDto } from '../dto/blog-entry.output.dto.js';
import { BlogTagOutputDto } from '../dto/blog-tag.output.dto.js';
import { ListBlogEntriesInputDto } from '../dto/list-blog-entries.input.dto.js';
import { ListBlogEntriesOutputDto } from '../dto/list-blog-entries.output.dto.js';
import { ListBlogTagsOutputDto } from '../dto/list-blog-tags.output.dto.js';
import { BlogService } from '../services/blog.service.js';

@Controller('blog')
export class BlogController {
	constructor(private readonly blogService: BlogService) {}

	@TypedRoute.Get('/')
	public async listEntries(
		@TypedQuery() query: ListBlogEntriesInputDto,
	): Promise<ListBlogEntriesOutputDto> {
		return this.blogService.listPublishedEntries(query);
	}

	@TypedRoute.Get('/tags')
	public async listTags(): Promise<ListBlogTagsOutputDto> {
		return this.blogService.listTags();
	}

	// Resolve a tag by id or slug (used by the /blog/tag/[tagId] page header).
	@TypedRoute.Get('/tags/:idOrSlug')
	public async getTag(@TypedParam('idOrSlug') idOrSlug: string): Promise<BlogTagOutputDto> {
		const tag = await this.blogService.getTagByIdOrSlug(idOrSlug);
		return { id: tag.id, name: tag.name, slug: tag.slug };
	}

	// Accepts either the entry id or its slug for SEO-friendly URLs.
	@TypedRoute.Get('/:idOrSlug')
	public async getEntry(@TypedParam('idOrSlug') idOrSlug: string): Promise<BlogEntryOutputDto> {
		return this.blogService.getPublishedEntry(idOrSlug);
	}

	// Explicit, FE-triggered view increment (kept out of the SSR fetch).
	@TypedRoute.Post('/:idOrSlug/view')
	public async registerView(@TypedParam('idOrSlug') idOrSlug: string): Promise<OkResponse> {
		return this.blogService.incrementViewCount(idOrSlug);
	}
}
