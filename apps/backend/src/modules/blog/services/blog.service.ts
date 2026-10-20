import { FilterQuery, QueryOrder, raw, wrap } from '@mikro-orm/core';

import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

import { deriveBlogContent } from 'blog-content';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { ImageService } from 'src/modules/image/services/image.service.js';
import { SitemapService } from 'src/modules/sitemap/services/sitemap.service.js';
import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';
import { slug as slugify } from 'src/shared/util/string.js';

import { BlogEntryStateEnum } from '../constants/blog-entry-state.enum.constant.js';
import { AdminBlogEntryOutputDto } from '../dto/admin-blog-entry.output.dto.js';
import { AdminListBlogEntriesInputDto } from '../dto/admin-list-blog-entries.input.dto.js';
import { AdminListBlogEntriesOutputDto } from '../dto/admin-list-blog-entries.output.dto.js';
import { BlogEntryOutputDto } from '../dto/blog-entry.output.dto.js';
import { CreateBlogEntryInputDto } from '../dto/create-blog-entry.input.dto.js';
import { ListBlogEntriesInputDto } from '../dto/list-blog-entries.input.dto.js';
import { ListBlogEntriesOutputDto } from '../dto/list-blog-entries.output.dto.js';
import { ListBlogTagsOutputDto } from '../dto/list-blog-tags.output.dto.js';
import { UpdateBlogEntryInputDto } from '../dto/update-blog-entry.input.dto.js';
import { UpsertBlogTagInputDto } from '../dto/upsert-blog-tag.input.dto.js';
import { BlogEntry } from '../entities/blog-entry.entity.js';
import { BlogTag } from '../entities/blog-tag.entity.js';
import { BlogEntryRepository } from '../repositories/blog-entry.repository.js';
import { BlogTagRepository } from '../repositories/blog-tag.repository.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A node in a TipTap/ProseMirror document (content is stored as stringified JSON).
interface ProseMirrorNode {
	type?: string;
	attrs?: Record<string, unknown>;
	content?: ProseMirrorNode[];
}

// Populate + serialize shapes reused across public endpoints.
const PUBLIC_ENTRY_POPULATE = ['author', 'author.profileImage', 'coverImage', 'tags'] as const;

const ADMIN_ENTRY_POPULATE = ['author', 'coverImage', 'tags'] as const;

// `q` matches as a literal substring: `%`, `_` and `\` typed into the search box are text.
const containsPattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

@Injectable()
export class BlogService implements OnModuleInit {
	constructor(
		private readonly blogEntryRepository: BlogEntryRepository,
		private readonly blogTagRepository: BlogTagRepository,
		private readonly imageService: ImageService,
		private readonly sitemapService: SitemapService,
	) {}

	// Published articles and the topic pages that have one (an empty `/blog/tag/…` page is
	// never submitted).
	onModuleInit() {
		const published = { state: BlogEntryStateEnum.PUBLISHED };
		const taggedPublished = { entries: { $some: published } };

		this.sitemapService.register({
			name: 'blog',
			count: () => this.blogEntryRepository.count(published),
			list: async (offset, limit) => {
				const entries = await this.blogEntryRepository.find(published, {
					fields: ['slug', 'updatedAt'],
					orderBy: { publishedAt: QueryOrder.ASC, id: QueryOrder.ASC },
					offset,
					limit,
				});
				return entries.map(entry => ({
					path: `/blog/${entry.slug}`,
					updatedAt: entry.updatedAt.toISOString(),
				}));
			},
		});

		this.sitemapService.register({
			name: 'blogtags',
			count: () => this.blogTagRepository.count(taggedPublished),
			list: async (offset, limit) => {
				const tags = await this.blogTagRepository.find(taggedPublished, {
					fields: ['slug', 'updatedAt'],
					orderBy: { slug: QueryOrder.ASC },
					offset,
					limit,
				});
				return tags.map(tag => ({
					path: `/blog/tag/${tag.slug}`,
					updatedAt: tag.updatedAt.toISOString(),
				}));
			},
		});
	}

	// ---------------------------------------------------------------------------
	// Public
	// ---------------------------------------------------------------------------

	async listPublishedEntries(query: ListBlogEntriesInputDto): Promise<ListBlogEntriesOutputDto> {
		const filters: FilterQuery<BlogEntry> = { state: BlogEntryStateEnum.PUBLISHED };

		if (query.tag) {
			filters.tags = UUID_REGEX.test(query.tag) ? { id: query.tag } : { slug: query.tag };
		}

		// Search both the title and the plain-text body projection.
		if (query.q) {
			const needle = containsPattern(query.q);
			filters.$or = [{ title: { $ilike: needle } }, { contentText: { $ilike: needle } }];
		}

		const [items, totalItems] = await this.blogEntryRepository.findAndCount(filters, {
			offset: (query.page - 1) * query.size,
			limit: query.size,
			populate: PUBLIC_ENTRY_POPULATE,
			orderBy:
				query.sort ?
					{ [query.sort.split(':')[0]]: query.sort.split(':')[1] }
				:	{ publishedAt: QueryOrder.DESC },
		});

		return {
			items: items.map(entry =>
				wrap(entry).serialize({
					skipNull: true,
					forceObject: true,
					populate: PUBLIC_ENTRY_POPULATE,
					// `content` is excluded from the summary shape.
					exclude: ['content', 'contentHtml', 'contentText'],
				}),
			) as ListBlogEntriesOutputDto['items'],
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	async getPublishedEntry(idOrSlug: string): Promise<BlogEntryOutputDto> {
		const entry = await this.blogEntryRepository.findOne(
			{
				...this.idOrSlugFilter(idOrSlug),
				state: BlogEntryStateEnum.PUBLISHED,
			},
			{ populate: PUBLIC_ENTRY_POPULATE },
		);

		if (!entry) throw new NotFoundException('Blog entry not found');

		return wrap(entry).serialize({
			skipNull: true,
			forceObject: true,
			populate: PUBLIC_ENTRY_POPULATE,
			// Public/preview render `contentHtml`; the raw JSON + text projection stay server-side.
			exclude: ['content', 'contentText'],
		}) as BlogEntryOutputDto;
	}

	/**
	 * Explicit, FE-triggered view increment (decoupled from SSR fetches / crawlers).
	 * Atomic in-DB `+ 1`; only counts published entries.
	 */
	async incrementViewCount(idOrSlug: string): Promise<OkResponse> {
		const affected = await this.blogEntryRepository.nativeUpdate(
			{ ...this.idOrSlugFilter(idOrSlug), state: BlogEntryStateEnum.PUBLISHED },
			{ viewCount: raw('view_count + 1') },
		);

		if (!affected) throw new NotFoundException('Blog entry not found');

		return { ok: true };
	}

	async listTags(): Promise<ListBlogTagsOutputDto> {
		const items = await this.blogTagRepository.findAll({ orderBy: { name: QueryOrder.ASC } });
		return {
			items: items.map(tag => ({ id: tag.id, name: tag.name, slug: tag.slug })),
		};
	}

	async getTagByIdOrSlug(idOrSlug: string): Promise<BlogTag> {
		const tag = await this.blogTagRepository.findOne(this.idOrSlugFilter(idOrSlug));
		if (!tag) throw new NotFoundException('Blog tag not found');
		return tag;
	}

	// ---------------------------------------------------------------------------
	// Admin
	// ---------------------------------------------------------------------------

	async adminListEntries(
		query: AdminListBlogEntriesInputDto,
	): Promise<AdminListBlogEntriesOutputDto> {
		const filters: FilterQuery<BlogEntry> = {};
		if (query.states) filters.state = { $in: query.states };
		if (query.tagId) filters.tags = { id: query.tagId };
		if (query.q) {
			const needle = containsPattern(query.q);
			filters.$or = [{ title: { $ilike: needle } }, { contentText: { $ilike: needle } }];
		}

		const [items, totalItems] = await this.blogEntryRepository.findAndCount(filters, {
			offset: (query.page - 1) * query.size,
			limit: query.size,
			populate: ADMIN_ENTRY_POPULATE,
			orderBy:
				query.sort ?
					{ [query.sort.split(':')[0]]: query.sort.split(':')[1] }
				:	{ createdAt: QueryOrder.DESC },
		});

		return {
			items: items.map(entry =>
				wrap(entry).serialize({
					skipNull: true,
					forceObject: true,
					populate: ADMIN_ENTRY_POPULATE,
					exclude: ['content', 'contentHtml', 'contentText'],
				}),
			) as AdminListBlogEntriesOutputDto['items'],
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	/**
	 * Admin preview: same public shape as {@link getPublishedEntry} (so the FE can reuse the
	 * exact blog detail rendering), but resolvable by id or slug and in ANY state — lets admins
	 * see drafts / removed entries before they go live.
	 */
	async adminPreviewEntry(idOrSlug: string): Promise<BlogEntryOutputDto> {
		const entry = await this.blogEntryRepository.findOne(this.idOrSlugFilter(idOrSlug), {
			populate: PUBLIC_ENTRY_POPULATE,
		});

		if (!entry) throw new NotFoundException('Blog entry not found');

		return wrap(entry).serialize({
			skipNull: true,
			forceObject: true,
			populate: PUBLIC_ENTRY_POPULATE,
			// Public/preview render `contentHtml`; the raw JSON + text projection stay server-side.
			exclude: ['content', 'contentText'],
		}) as BlogEntryOutputDto;
	}

	async adminGetEntry(id: string): Promise<AdminBlogEntryOutputDto> {
		const entry = await this.blogEntryRepository.findOne(
			{ id },
			{ populate: ADMIN_ENTRY_POPULATE },
		);
		if (!entry) throw new NotFoundException('Blog entry not found');
		return this.serializeAdminEntry(entry);
	}

	// The admin controller is the only caller and always passes the acting admin as the author.
	async createEntry(
		body: CreateBlogEntryInputDto,
		author: User,
	): Promise<AdminBlogEntryOutputDto> {
		const em = this.blogEntryRepository.getEntityManager();

		const { content, contentHtml, contentText } = await this.buildContent(body.content);
		const coverImage =
			body.coverImage?.startsWith('data:') ?
				await this.imageService.createImage(body.coverImage, 'blog-covers', 'cover')
			:	undefined;

		const entry = this.blogEntryRepository.create({
			title: body.title,
			content,
			contentHtml,
			contentText,
			excerpt: body.excerpt ?? null,
			slug: await this.generateUniqueSlug(body.title),
			state: BlogEntryStateEnum.DRAFT,
			author,
			coverImage,
		});

		entry.tags.set(await this.upsertTagsByName(body.tagNames));

		await em.flush();
		await wrap(entry).init({ populate: ADMIN_ENTRY_POPULATE });
		return this.serializeAdminEntry(entry);
	}

	async updateEntry(id: string, body: UpdateBlogEntryInputDto): Promise<AdminBlogEntryOutputDto> {
		const em = this.blogEntryRepository.getEntityManager();
		const entry = await this.blogEntryRepository.findOne({ id }, { populate: ['tags'] });
		if (!entry) throw new NotFoundException('Blog entry not found');

		// Slug is intentionally immutable after creation (stable public URLs / SEO).
		if (body.title !== undefined) entry.title = body.title;
		if (body.content !== undefined) {
			const { content, contentHtml, contentText } = await this.buildContent(body.content);
			entry.content = content;
			entry.contentHtml = contentHtml;
			entry.contentText = contentText;
		}
		if (body.excerpt !== undefined) entry.excerpt = body.excerpt;
		if (body.coverImage !== undefined) {
			if (!body.coverImage) {
				entry.coverImage = undefined; // cleared
			} else if (body.coverImage.startsWith('data:')) {
				entry.coverImage = await this.imageService.createImage(
					body.coverImage,
					'blog-covers',
					'cover',
				);
			}
			// An existing hosted URL means "unchanged" — leave the current cover in place.
		}
		// Omitted ⇒ leave tags unchanged; present (even empty) ⇒ replace the set.
		if (body.tagNames !== undefined) {
			entry.tags.set(await this.upsertTagsByName(body.tagNames));
		}

		await em.flush();
		await wrap(entry).init({ populate: ADMIN_ENTRY_POPULATE });
		return this.serializeAdminEntry(entry);
	}

	async changeEntryState(
		id: string,
		state: BlogEntryStateEnum,
	): Promise<AdminBlogEntryOutputDto> {
		const em = this.blogEntryRepository.getEntityManager();
		const entry = await this.blogEntryRepository.findOne({ id });
		if (!entry) throw new NotFoundException('Blog entry not found');

		entry.state = state;
		if (state === BlogEntryStateEnum.PUBLISHED) {
			// Stamp publishedAt the first time an entry goes live; keep it stable afterwards.
			if (!entry.publishedAt) entry.publishedAt = new Date();
		}

		await em.flush();
		await wrap(entry).init({ populate: ADMIN_ENTRY_POPULATE });
		return this.serializeAdminEntry(entry);
	}

	async createTag(body: UpsertBlogTagInputDto): Promise<BlogTag> {
		const em = this.blogTagRepository.getEntityManager();
		const tag = this.blogTagRepository.create({
			name: body.name,
			slug: await this.generateUniqueTagSlug(body.slug || body.name),
		});
		await em.flush();
		return tag;
	}

	async updateTag(id: string, body: UpsertBlogTagInputDto): Promise<BlogTag> {
		const em = this.blogTagRepository.getEntityManager();
		const tag = await this.blogTagRepository.findOne({ id });
		if (!tag) throw new NotFoundException('Blog tag not found');

		tag.name = body.name;
		if (body.slug !== undefined) {
			tag.slug = await this.generateUniqueTagSlug(body.slug || body.name, tag.id);
		}
		await em.flush();
		return tag;
	}

	async deleteTag(id: string): Promise<OkResponse> {
		const em = this.blogTagRepository.getEntityManager();
		const tag = await this.blogTagRepository.findOne({ id });
		if (!tag) throw new NotFoundException('Blog tag not found');
		em.remove(tag);
		await em.flush();
		return { ok: true };
	}

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	/**
	 * Upserts an entry's tag set from a list of display names: names collapsing to the same slug
	 * are treated as one, an existing tag with that slug is reused, otherwise a new tag is created
	 * (unflushed — the caller flushes the whole entry mutation in one transaction). Lets the admin
	 * editor add tags on the fly by typing a name.
	 */
	private async upsertTagsByName(names?: string[]): Promise<BlogTag[]> {
		if (!names?.length) return [];

		// Collapse duplicates/case-variants within the request by their derived slug.
		const bySlug = new Map<string, string>();
		for (const name of names) {
			const trimmed = name.trim();
			if (!trimmed) continue;
			const base = slugify(trimmed) || 'tag';
			if (!bySlug.has(base)) bySlug.set(base, trimmed);
		}

		const result: BlogTag[] = [];
		for (const [base, name] of bySlug) {
			const existing = await this.blogTagRepository.findOne({ slug: base });
			result.push(
				existing ??
					this.blogTagRepository.create({
						name,
						slug: await this.generateUniqueTagSlug(name),
					}),
			);
		}
		return result;
	}

	private idOrSlugFilter(idOrSlug: string): { id: string } | { slug: string } {
		return UUID_REGEX.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug };
	}

	/**
	 * Prepares an entry's content for persistence: hosts any inline images, then derives the
	 * rendered HTML + plain text from the (image-rewritten) JSON via the shared `blog-content`
	 * schema. The three are stored together so the public page renders HTML directly and `q`
	 * search can match the body text.
	 */
	private async buildContent(
		rawContent: string,
	): Promise<{ content: string; contentHtml: string; contentText: string }> {
		const content = await this.uploadInlineImages(rawContent);
		const { html, text } = deriveBlogContent(content);
		return { content, contentHtml: html, contentText: text };
	}

	/**
	 * Content is a stringified TipTap/ProseMirror document. This walks its image nodes, uploads
	 * any whose `src` is an inline data URL to storage, and rewrites them to the hosted URL.
	 * Already-hosted (`https://…`) URLs are left untouched, so re-saving is idempotent and never
	 * re-uploads existing images. Non-JSON content (legacy/plain) is returned unchanged.
	 */
	private async uploadInlineImages(content: string): Promise<string> {
		let doc: ProseMirrorNode;
		try {
			doc = JSON.parse(content) as ProseMirrorNode;
		} catch {
			return content;
		}

		const imageNodes: ProseMirrorNode[] = [];
		const collect = (node: ProseMirrorNode | undefined): void => {
			if (!node || typeof node !== 'object') return;
			if (node.type === 'image' && typeof node.attrs?.src === 'string') {
				imageNodes.push(node);
			}
			node.content?.forEach(collect);
		};
		collect(doc);

		const dataUrls = [
			...new Set(
				imageNodes
					.map(node => node.attrs!.src as string)
					.filter(src => src.startsWith('data:')),
			),
		];
		if (!dataUrls.length) return content;

		const hostedByDataUrl = new Map<string, string>();
		for (const dataUrl of dataUrls) {
			hostedByDataUrl.set(
				dataUrl,
				await this.imageService.uploadImageUrl(dataUrl, 'blog-content', 'inline'),
			);
		}

		for (const node of imageNodes) {
			const hosted = hostedByDataUrl.get(node.attrs!.src as string);
			if (hosted) node.attrs!.src = hosted;
		}

		return JSON.stringify(doc);
	}

	private serializeAdminEntry(entry: BlogEntry): AdminBlogEntryOutputDto {
		return wrap(entry).serialize({
			skipNull: true,
			forceObject: true,
			populate: ADMIN_ENTRY_POPULATE,
			// The editor round-trips the raw JSON `content`; the derived html/text are server-only.
			exclude: ['contentHtml', 'contentText'],
		}) as AdminBlogEntryOutputDto;
	}

	// Entry slugs are generated once at creation and never change afterwards.
	private async generateUniqueSlug(source: string): Promise<string> {
		const base = slugify(source) || 'entry';
		let candidate = base;
		let suffix = 2;

		while (true) {
			const clash = await this.blogEntryRepository.findOne({ slug: candidate });
			if (!clash) return candidate;
			candidate = `${base}-${suffix++}`;
		}
	}

	private async generateUniqueTagSlug(source: string, excludeId?: string): Promise<string> {
		const base = slugify(source) || 'tag';
		let candidate = base;
		let suffix = 2;

		while (true) {
			const clash = await this.blogTagRepository.findOne({
				slug: candidate,
				...(excludeId ? { id: { $ne: excludeId } } : {}),
			});
			if (!clash) return candidate;
			candidate = `${base}-${suffix++}`;
		}
	}
}
