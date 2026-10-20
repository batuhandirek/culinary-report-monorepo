import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { userFactory } from 'src/modules/auth/tests/factories/user.factory.js';
import { Image } from 'src/modules/image/entities/image.entity.js';
import { ImageService } from 'src/modules/image/services/image.service.js';
import { SitemapService } from 'src/modules/sitemap/services/sitemap.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { BlogEntryStateEnum } from '../constants/blog-entry-state.enum.constant.js';
import { BlogService } from '../services/blog.service.js';

import { blogEntryFactory } from './factories/blog-entry.factory.js';
import { blogTagFactory } from './factories/blog-tag.factory.js';

describe('BlogService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: BlogService;
	let author: User;
	// Explicit mock (not the auto-mock) so we can drive/assert on image uploads.
	const imageService = {
		createImage: jest.fn<ImageService['createImage']>(),
		uploadImageUrl: jest.fn<ImageService['uploadImageUrl']>(),
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BlogService,
				{ provide: ImageService, useValue: imageService },
				SitemapService,
			],
		});
		service = harness.moduleRef.get(BlogService);
		entityManagerManager.setEntityManager(harness.orm.em);

		author = userFactory.build();
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	describe('createEntry', () => {
		it('creates a DRAFT entry with a generated slug and associated tags', async () => {
			const tag = await blogTagFactory.create({ name: 'Rehber', slug: 'rehber' });

			const entry = await service.createEntry(
				{
					title: 'İkinci El Alışveriş Rehberi',
					content: '# Merhaba',
					tagNames: ['Rehber'],
				},
				author,
			);

			expect(entry.state).toBe(BlogEntryStateEnum.DRAFT);
			expect(entry.slug).toBe('ikinci-el-alisveris-rehberi');
			expect(entry.publishedAt).toBeUndefined();
			expect(entry.author?.id).toBe(author.id);
			// The pre-existing "Rehber" tag is reused, not duplicated.
			expect(entry.tags?.map(t => t.id)).toEqual([tag.id]);
		});

		it('deduplicates slugs derived from identical titles', async () => {
			const first = await service.createEntry({ title: 'Aynı Başlık', content: 'x' }, author);
			const second = await service.createEntry(
				{ title: 'Aynı Başlık', content: 'y' },
				author,
			);

			expect(first.slug).toBe('ayni-baslik');
			expect(second.slug).toBe('ayni-baslik-2');
		});
	});

	describe('tagNames upsert', () => {
		it('creates missing tags and reuses existing ones (matched by slug) on create', async () => {
			const existing = await blogTagFactory.create({ name: 'Mevcut', slug: 'mevcut' });

			const entry = await service.createEntry(
				{ title: 'Etiket Upsert', content: 'x', tagNames: ['Mevcut', 'Taze Etiket'] },
				author,
			);

			const slugs = entry.tags?.map(t => t.slug).sort();
			expect(slugs).toEqual(['mevcut', 'taze-etiket']);
			// The pre-existing tag was reused, not duplicated.
			expect(entry.tags?.find(t => t.slug === 'mevcut')?.id).toBe(existing.id);
		});

		it('collapses duplicate / case-variant names within one request into a single tag', async () => {
			const entry = await service.createEntry(
				{ title: 'Tekilleştir', content: 'x', tagNames: ['Haber', 'haber', 'HABER'] },
				author,
			);

			expect(entry.tags?.map(t => t.slug)).toEqual(['haber']);
		});

		it('replaces the tag set by name on update, reusing existing tags', async () => {
			const existing = await blogTagFactory.create({ name: 'Ortak', slug: 'ortak' });
			const created = await service.createEntry(
				{ title: 'Birleşim', content: 'x', tagNames: ['Eski'] },
				author,
			);

			const updated = await service.updateEntry(created.id, {
				tagNames: ['Ortak', 'Sadece İsim'],
			});

			const slugs = updated.tags?.map(t => t.slug).sort();
			expect(slugs).toEqual(['ortak', 'sadece-isim']);
			expect(updated.tags?.find(t => t.slug === 'ortak')?.id).toBe(existing.id);
		});

		it('leaves tags unchanged when tagNames is omitted on update', async () => {
			const created = await service.createEntry(
				{ title: 'Değişmez Etiket', content: 'v1', tagNames: ['Kalıcı'] },
				author,
			);

			const updated = await service.updateEntry(created.id, { content: 'v2' });
			expect(updated.tags?.map(t => t.slug)).toEqual(['kalici']);
		});
	});

	describe('changeEntryState', () => {
		it('stamps publishedAt on first publish and keeps it stable afterwards', async () => {
			const created = await service.createEntry(
				{ title: 'Yayın Testi', content: 'x' },
				author,
			);

			const published = await service.changeEntryState(
				created.id,
				BlogEntryStateEnum.PUBLISHED,
			);
			expect(published.publishedAt).toBeInstanceOf(Date);
			const firstPublishedAt = published.publishedAt;

			// Drafting then re-publishing must not move publishedAt.
			await service.changeEntryState(created.id, BlogEntryStateEnum.DRAFT);
			const republished = await service.changeEntryState(
				created.id,
				BlogEntryStateEnum.PUBLISHED,
			);
			expect(republished.publishedAt).toEqual(firstPublishedAt);
		});
	});

	describe('updateEntry', () => {
		it('updates fields and fully replaces the tag set', async () => {
			const tagB = await blogTagFactory.create({ name: 'B', slug: 'b' });
			const created = await service.createEntry(
				{ title: 'Güncelleme', content: 'v1', tagNames: ['A'] },
				author,
			);

			const updated = await service.updateEntry(created.id, {
				content: 'v2',
				excerpt: 'özet',
				tagNames: ['B'],
			});

			expect(updated.content).toBe('v2');
			expect(updated.excerpt).toBe('özet');
			expect(updated.tags?.map(t => t.id)).toEqual([tagB.id]);
		});
	});

	describe('public reads', () => {
		it('lists only published entries (newest first) and omits content', async () => {
			const tag = await blogTagFactory.create({ name: 'Liste', slug: 'liste' });
			blogEntryFactory
				.published()
				.build(
					{ title: 'Eski', publishedAt: new Date('2024-01-01') },
					{ associations: { author } },
				);
			const newer = blogEntryFactory
				.published()
				.build(
					{ title: 'Yeni', publishedAt: new Date('2025-01-01') },
					{ associations: { author } },
				);
			newer.tags.add(await blogTagFactory.create({ name: 'x', slug: 'x-newer' }));
			blogEntryFactory.draft().build({ title: 'Taslak' }, { associations: { author } });
			await harness.orm.em.flush();

			const result = await service.listPublishedEntries({ page: 1, size: 50 });

			const titles = result.items.map(i => i.title);
			expect(titles).toContain('Yeni');
			expect(titles).toContain('Eski');
			expect(titles).not.toContain('Taslak');
			// Newest first.
			expect(titles.indexOf('Yeni')).toBeLessThan(titles.indexOf('Eski'));
			// Summary shape excludes markdown content.
			expect((result.items[0] as { content?: string }).content).toBeUndefined();

			// Tag filter (by slug).
			const tagged = blogEntryFactory
				.published()
				.build({ title: 'Etiketli' }, { associations: { author } });
			tagged.tags.add(tag);
			await harness.orm.em.flush();
			const filtered = await service.listPublishedEntries({
				page: 1,
				size: 50,
				tag: 'liste',
			});
			expect(filtered.items.map(i => i.title)).toEqual(['Etiketli']);
		});

		it('searches titles (q) and sorts by view count', async () => {
			const mk = (title: string, viewCount: number) =>
				blogEntryFactory
					.published()
					.build({ title, viewCount }, { associations: { author } });
			mk('Zorbik en popüler', 30);
			mk('Zorbik orta', 20);
			mk('Zorbik az', 5);
			blogEntryFactory
				.published()
				.build({ title: 'Alakasız yazı' }, { associations: { author } });
			await harness.orm.em.flush();

			// q filters by title (case-insensitive), isolating the "Zorbik" set.
			const searched = await service.listPublishedEntries({ page: 1, size: 50, q: 'zorbik' });
			expect(searched.totalItems).toBe(3);
			expect(searched.items.map(i => i.title).sort()).toEqual([
				'Zorbik az',
				'Zorbik en popüler',
				'Zorbik orta',
			]);

			// sort=viewCount:DESC orders most-viewed first (scoped via q for determinism).
			const popular = await service.listPublishedEntries({
				page: 1,
				size: 50,
				q: 'zorbik',
				sort: 'viewCount:DESC',
			});
			expect(popular.items.map(i => i.title)).toEqual([
				'Zorbik en popüler',
				'Zorbik orta',
				'Zorbik az',
			]);
		});

		it('gets a published entry by slug and by id, and 404s otherwise', async () => {
			const entry = blogEntryFactory
				.published()
				.build({ title: 'Detay', slug: 'detay' }, { associations: { author } });
			await harness.orm.em.flush();

			const bySlug = await service.getPublishedEntry('detay');
			expect(bySlug.id).toBe(entry.id);
			expect(bySlug.contentHtml).toBeDefined();

			const byId = await service.getPublishedEntry(entry.id);
			expect(byId.slug).toBe('detay');

			await expect(service.getPublishedEntry('yok-boyle-bir-sey')).rejects.toThrow();

			// Drafts are not publicly readable.
			const draft = blogEntryFactory
				.draft()
				.build({ slug: 'gizli-taslak' }, { associations: { author } });
			await harness.orm.em.flush();
			await expect(service.getPublishedEntry(draft.slug)).rejects.toThrow();
		});

		it('increments view count only for published entries', async () => {
			const entry = blogEntryFactory
				.published()
				.build({ slug: 'goruntulenme' }, { associations: { author } });
			await harness.orm.em.flush();

			await service.incrementViewCount('goruntulenme');
			await service.incrementViewCount(entry.id);
			harness.orm.em.clear();

			const reloaded = await service.getPublishedEntry('goruntulenme');
			expect(reloaded.viewCount).toBe(2);

			await expect(service.incrementViewCount('bilinmeyen')).rejects.toThrow();
		});
	});

	describe('image handling', () => {
		// Content is stringified TipTap JSON; inline images are `image` nodes with a data-URL src.
		const docWith = (...content: unknown[]) => JSON.stringify({ type: 'doc', content });

		it('uploads inline data-URL images on create and rewrites content to hosted URLs', async () => {
			imageService.uploadImageUrl
				.mockReset()
				.mockResolvedValue('https://cdn.example.com/hosted-inline.png');

			const created = await service.createEntry(
				{
					title: 'Görselli Yazı',
					content: docWith(
						{ type: 'paragraph', content: [{ type: 'text', text: 'Giriş metni.' }] },
						{ type: 'image', attrs: { src: 'data:image/png;base64,iVBORw0KGgoAAAA' } },
					),
				},
				author,
			);

			expect(imageService.uploadImageUrl).toHaveBeenCalledWith(
				'data:image/png;base64,iVBORw0KGgoAAAA',
				'blog-content',
				'inline',
			);
			expect(created.content).toContain('https://cdn.example.com/hosted-inline.png');
			expect(created.content).not.toContain('data:image');
		});

		it('leaves already-hosted inline images untouched (idempotent re-save)', async () => {
			imageService.uploadImageUrl.mockReset().mockResolvedValue('https://unused');

			const created = await service.createEntry(
				{
					title: 'Zaten Yüklü',
					content: docWith({
						type: 'image',
						attrs: { src: 'https://cdn.example.com/existing.png' },
					}),
				},
				author,
			);

			expect(imageService.uploadImageUrl).not.toHaveBeenCalled();
			expect(created.content).toContain('https://cdn.example.com/existing.png');
		});

		it('uploads a data-URL cover image and exposes its hosted URL', async () => {
			imageService.createImage.mockReset().mockImplementation(async () =>
				harness.orm.em.create(Image, {
					remoteId: 'remote-1',
					width: 1200,
					height: 630,
					aspectRatio: 1200 / 630,
					path: '/blog/cover.png',
					fileName: 'cover.png',
					fileType: 'image/png',
					fileSize: 2048,
					url: 'https://cdn.example.com/cover.png',
				}),
			);

			const created = await service.createEntry(
				{
					title: 'Kapaklı Yazı',
					content: 'İçerik.',
					coverImage: 'data:image/png;base64,QQQQ',
				},
				author,
			);

			expect(imageService.createImage).toHaveBeenCalledWith(
				'data:image/png;base64,QQQQ',
				'blog-covers',
				'cover',
			);
			expect(created.coverImage?.url).toBe('https://cdn.example.com/cover.png');
		});
	});

	describe('content rendering + body search', () => {
		it('renders JSON content to HTML on save and exposes it on the published entry', async () => {
			const created = await service.createEntry(
				{
					title: 'HTML Üretimi',
					content: JSON.stringify({
						type: 'doc',
						content: [
							{
								type: 'heading',
								attrs: { level: 2, textAlign: 'center' },
								content: [{ type: 'text', text: 'Başlık' }],
							},
							{
								type: 'cta',
								attrs: {
									title: 'Hazır mısın?',
									description: 'Hemen başla',
									label: 'Satın al',
									href: 'https://x.com',
									variant: 'primary',
								},
							},
						],
					}),
				},
				author,
			);
			await service.changeEntryState(created.id, BlogEntryStateEnum.PUBLISHED);

			const published = await service.getPublishedEntry(created.id);
			expect(published.contentHtml).toContain('<h2 style="text-align: center;">Başlık</h2>');
			// The CTA renders as a styled block with its title, description and button.
			expect(published.contentHtml).toContain('class="blog-cta blog-cta--primary"');
			expect(published.contentHtml).toContain('blog-cta__description">Hemen başla');
			expect(published.contentHtml).toContain('Satın al');
		});

		it('matches the plain-text body (not just the title) in q search', async () => {
			const created = await service.createEntry(
				{
					title: 'Alakasız Başlık',
					content: JSON.stringify({
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'İçeride zurnabatik geçiyor.' }],
							},
						],
					}),
				},
				author,
			);
			await service.changeEntryState(created.id, BlogEntryStateEnum.PUBLISHED);

			// The needle only appears in the body, never in the title.
			const result = await service.listPublishedEntries({
				page: 1,
				size: 50,
				q: 'zurnabatik',
			});
			expect(result.items.map(i => i.id)).toContain(created.id);
		});
	});

	describe('adminPreviewEntry', () => {
		it('resolves a DRAFT entry by slug and id (unlike the public read) with full content', async () => {
			const draft = blogEntryFactory.draft().build(
				{
					title: 'Önizleme Taslağı',
					slug: 'onizleme-taslagi',
					content: JSON.stringify({
						type: 'doc',
						content: [
							{ type: 'paragraph', content: [{ type: 'text', text: 'Gizli' }] },
						],
					}),
				},
				{ associations: { author } },
			);
			await harness.orm.em.flush();

			// Public read refuses drafts…
			await expect(service.getPublishedEntry('onizleme-taslagi')).rejects.toThrow();

			// …but admin preview returns them, by slug and by id, with rendered html populated.
			const bySlug = await service.adminPreviewEntry('onizleme-taslagi');
			expect(bySlug.id).toBe(draft.id);
			expect(bySlug.state).toBe(BlogEntryStateEnum.DRAFT);
			expect(bySlug.contentHtml).toContain('Gizli');
			expect(bySlug.author?.publicName).toBe(author.publicName);

			const byId = await service.adminPreviewEntry(draft.id);
			expect(byId.slug).toBe('onizleme-taslagi');

			await expect(service.adminPreviewEntry('yok-boyle-bir-sey')).rejects.toThrow();
		});
	});

	describe('tags', () => {
		it('creates, updates and deletes tags', async () => {
			const created = await service.createTag({ name: 'Yeni Etiket' });
			expect(created.slug).toBe('yeni-etiket');

			const updated = await service.updateTag(created.id, { name: 'Değişti' });
			expect(updated.name).toBe('Değişti');

			await service.deleteTag(created.id);
			const list = await service.listTags();
			expect(list.items.map(t => t.id)).not.toContain(created.id);
		});
	});

	describe('sitemap sections', () => {
		it('lists published articles and only the tags that have one', async () => {
			const sitemap = harness.moduleRef.get(SitemapService);
			service.onModuleInit();

			const live = await blogTagFactory.create({ name: 'Live topic', slug: 'live-topic' });
			const empty = await blogTagFactory.create({ name: 'Empty topic', slug: 'empty-topic' });
			const published = blogEntryFactory
				.published()
				.build({ slug: 'sitemap-published' }, { associations: { author } });
			published.tags.add(live);
			const draft = blogEntryFactory
				.draft()
				.build({ slug: 'sitemap-draft' }, { associations: { author } });
			draft.tags.add(empty);
			await harness.orm.em.flush();

			const entries = await sitemap.getEntries('blog', 1, 10_000);
			const entryPaths = entries.items.map(item => item.path);
			expect(entryPaths).toContain('/blog/sitemap-published');
			expect(entryPaths).not.toContain('/blog/sitemap-draft');

			const tags = await sitemap.getEntries('blogtags', 1, 10_000);
			const tagPaths = tags.items.map(item => item.path);
			expect(tagPaths).toContain('/blog/tag/live-topic');
			expect(tagPaths).not.toContain('/blog/tag/empty-topic');
			expect(tags.totalItems).toBe(tagPaths.length);
		});
	});
});
