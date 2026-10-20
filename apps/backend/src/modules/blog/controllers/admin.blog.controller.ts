import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { AuthenticatedUserReference } from 'src/modules/auth/decorators/authenticated-user-reference.decorator.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import { AdminBlogEntryOutputDto } from '../dto/admin-blog-entry.output.dto.js';
import { AdminListBlogEntriesInputDto } from '../dto/admin-list-blog-entries.input.dto.js';
import { AdminListBlogEntriesOutputDto } from '../dto/admin-list-blog-entries.output.dto.js';
import { BlogEntryOutputDto } from '../dto/blog-entry.output.dto.js';
import { BlogTagOutputDto } from '../dto/blog-tag.output.dto.js';
import { ChangeBlogEntryStateInputDto } from '../dto/change-blog-entry-state.input.dto.js';
import { CreateBlogEntryInputDto } from '../dto/create-blog-entry.input.dto.js';
import { ListBlogTagsOutputDto } from '../dto/list-blog-tags.output.dto.js';
import { UpdateBlogEntryInputDto } from '../dto/update-blog-entry.input.dto.js';
import { UpsertBlogTagInputDto } from '../dto/upsert-blog-tag.input.dto.js';
import { BlogService } from '../services/blog.service.js';

@UseGuards(AuthenticationGuard, RolesGuard)
@Controller('/admin/blog')
export class BlogAdminController {
	constructor(private readonly blogService: BlogService) {}

	// ---- Entries ----

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Get('/')
	public async listEntries(
		@TypedQuery() query: AdminListBlogEntriesInputDto,
	): Promise<AdminListBlogEntriesOutputDto> {
		return this.blogService.adminListEntries(query);
	}

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Post('/')
	public async createEntry(
		@AuthenticatedUserReference() user: User,
		@TypedBody() body: CreateBlogEntryInputDto,
	): Promise<AdminBlogEntryOutputDto> {
		return this.blogService.createEntry(body, user);
	}

	// ---- Tags (declared before /:id so they don't get shadowed) ----

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Get('/tags')
	public async listTags(): Promise<ListBlogTagsOutputDto> {
		return this.blogService.listTags();
	}

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Post('/tags')
	public async createTag(@TypedBody() body: UpsertBlogTagInputDto): Promise<BlogTagOutputDto> {
		const tag = await this.blogService.createTag(body);
		return { id: tag.id, name: tag.name, slug: tag.slug };
	}

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Patch('/tags/:id')
	public async updateTag(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: UpsertBlogTagInputDto,
	): Promise<BlogTagOutputDto> {
		const tag = await this.blogService.updateTag(id, body);
		return { id: tag.id, name: tag.name, slug: tag.slug };
	}

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Delete('/tags/:id')
	public async deleteTag(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<OkResponse> {
		return this.blogService.deleteTag(id);
	}

	// Public-shaped preview (id or slug), visible in ANY state — powers the admin "preview
	// draft" view that reuses the public blog detail rendering. Declared before /:id so the
	// two-segment path is unambiguous.
	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Get('/:idOrSlug/preview')
	public async previewEntry(
		@TypedParam('idOrSlug') idOrSlug: string,
	): Promise<BlogEntryOutputDto> {
		return this.blogService.adminPreviewEntry(idOrSlug);
	}

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Get('/:id')
	public async getEntry(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminBlogEntryOutputDto> {
		return this.blogService.adminGetEntry(id);
	}

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Patch('/:id')
	public async updateEntry(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: UpdateBlogEntryInputDto,
	): Promise<AdminBlogEntryOutputDto> {
		return this.blogService.updateEntry(id, body);
	}

	// State transitions (DRAFT / PUBLISHED / REMOVED) — REMOVED is the soft delete.
	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Put('/:id/state')
	public async changeEntryState(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: ChangeBlogEntryStateInputDto,
	): Promise<AdminBlogEntryOutputDto> {
		return this.blogService.changeEntryState(id, body.state);
	}
}
