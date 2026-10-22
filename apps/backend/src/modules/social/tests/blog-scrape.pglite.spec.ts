import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySource, CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { BlogFetchService } from '../services/blog-fetch.service.js';
import { BlogScrapeService } from '../services/blog-scrape.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';
import { blogExternalId } from '../util/blog-feed.js';

const NOW = new Date('2026-10-22T12:00:00Z');
const ARTICLE = 'Bei Kroque in der Weserstraße gibt es die besten Toasts in Neukölln. '.repeat(15);

const item = (url: string, date: string, html: string, title = url.split('/').filter(Boolean).at(-1)!) => `
	<item>
		<title>${title}</title>
		<link>${url}</link>
		<pubDate>${new Date(date).toUTCString()}</pubDate>
		<content:encoded><![CDATA[${html}]]></content:encoded>
	</item>`;
const rss = (title: string, items: string[]) =>
	`<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${title}</title>${items.join('')}</channel></rss>`;

// Blog A: found through its homepage's <link>; one full article, one excerpt, one too old
const A = 'https://www.blog-a.example.de';
// Blog B: its source is the feed itself, three pages deep
const B = 'https://blog-b.example.com/food/feed/';
const WEB: Record<string, string> = {
	[A]: `<html><head><link rel="alternate" type="application/rss+xml" href="/feed/"></head><body>Home</body></html>`,
	[`${A}/feed/`]: rss('Blog A', [
		item(`${A}/kroque/`, '2026-10-10T10:00:00Z', `<p>${ARTICLE}</p>`, 'Kroque'),
		item(`${A}/brunch-list/?utm_source=rss`, '2026-09-01T10:00:00Z', '<p>Five brunch spots…</p>', 'Five brunch spots'),
		item(`${A}/old/`, '2026-03-01T10:00:00Z', `<p>${ARTICLE}</p>`),
	]),
	[`${A}/brunch-list/?utm_source=rss`]: `<html><body><nav>Menu</nav><article><h1>Five brunch spots</h1><p>${ARTICLE}</p></article></body></html>`,
	[B]: rss('Blog B', [
		item('https://blog-b.example.com/food/one/', '2026-10-01T10:00:00Z', `<p>${ARTICLE}</p>`),
		item('https://blog-b.example.com/food/two/', '2026-09-01T10:00:00Z', `<p>${ARTICLE}</p>`),
	]),
	[`${B}?paged=2`]: rss('Blog B', [
		item('https://blog-b.example.com/food/three/', '2026-08-01T10:00:00Z', `<p>${ARTICLE}</p>`),
		item('https://blog-b.example.com/food/four/', '2026-07-01T10:00:00Z', `<p>${ARTICLE}</p>`),
	]),
	[`${B}?paged=3`]: rss('Blog B', [
		item('https://blog-b.example.com/food/five/', '2026-01-01T10:00:00Z', `<p>${ARTICLE}</p>`),
	]),
	// Blog C announces nothing and answers no feed path
	'https://blog-c.example.org': '<html><body>No feed here</body></html>',
};

describe('BlogScrapeService', () => {
	let harness: PgliteTestingModule;
	let service: BlogScrapeService;
	let berlin: City;
	const get = jest.fn(async (url: string) => (url in WEB ? { url, body: WEB[url] } : null));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BlogScrapeService,
				SocialPostService,
				SocialAccountService,
				CityService,
				{ provide: BlogFetchService, useValue: { get } },
			],
		});
		service = harness.moduleRef.get(BlogScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		berlin = cityFactory.build();
		testCitySource(em, berlin, CitySourceKindEnum.BLOG, A);
		testCitySource(em, berlin, CitySourceKindEnum.BLOG, B);
		testCitySource(em, berlin, CitySourceKindEnum.BLOG, 'https://blog-c.example.org');
		testCitySource(em, berlin, CitySourceKindEnum.BLOG, 'https://off.example.com', false);
		// The same people on Instagram: the blog joins their creator
		await harness.moduleRef.get(SocialAccountService).ensure(SocialPlatformEnum.INSTAGRAM, 'blog_a.example', berlin);
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		get.mockClear();
	});

	it('stores the window’s new articles as blog posts and notes each blog’s feed or trouble', async () => {
		const result = await service.scrapeCity(berlin, NOW);

		expect(result).toMatchObject({ blogs: 3, saved: 6, failed: 1 });
		// Sources added in one flush share their createdAt, so their order is not fixed
		expect(
			result.details.map(d => [d.source, d.feedUrl, d.pages, d.saved, d.fromPages, d.error]).sort((a, b) => `${a[0]}`.localeCompare(`${b[0]}`)),
		).toEqual([
			[B, B, 3, 4, 0, null],
			['https://blog-c.example.org', null, 0, 0, 0, 'No RSS or Atom feed found'],
			[A, `${A}/feed/`, 1, 2, 1, null],
		]);
		// The disabled blog is never asked
		expect(get.mock.calls.some(([url]) => url.includes('off.example.com'))).toBe(false);

		const em = harness.orm.em.fork();
		const posts = await em.find(SocialPost, { platform: SocialPlatformEnum.BLOG }, { orderBy: { postedAt: 'desc' }, populate: ['account'] });
		expect(posts.map(p => [p.url, p.author, p.source])).toEqual([
			[`${A}/kroque/`, 'blog-a.example.de', `blog:${A}`],
			['https://blog-b.example.com/food/one/', 'blog-b.example.com', `blog:${B}`],
			[`${A}/brunch-list/`, 'blog-a.example.de', `blog:${A}`],
			['https://blog-b.example.com/food/two/', 'blog-b.example.com', `blog:${B}`],
			['https://blog-b.example.com/food/three/', 'blog-b.example.com', `blog:${B}`],
			['https://blog-b.example.com/food/four/', 'blog-b.example.com', `blog:${B}`],
		]);
		// Title, then the text: the feed's when whole, the page's article when the feed had an excerpt
		expect(posts[0].text).toBe(`Kroque\n\n${ARTICLE.trim()}`);
		expect(posts[2].text).toBe(`Five brunch spots\n\nFive brunch spots\n${ARTICLE.trim()}`);
		expect(posts[2].externalId).toBe(blogExternalId(`${A}/brunch-list/`));
		expect(posts.every(p => p.views === 0 && p.city.id === berlin.id && p.analysedAt == null)).toBe(true);

		const accounts = await em.find(SocialAccount, { handle: { $in: ['blog-a.example.de', 'blog_a.example'] } }, { orderBy: { platform: 'asc' } });
		expect(accounts.map(a => [a.platform, a.handle, a.displayName])).toEqual([
			[SocialPlatformEnum.INSTAGRAM, 'blog_a.example', null],
			[SocialPlatformEnum.BLOG, 'blog-a.example.de', 'Blog A'],
		]);
		expect(accounts[0].creator.id).toBe(accounts[1].creator.id);

		const sources = await em.find(CitySource, { city: berlin.id }, { orderBy: { value: 'asc' } });
		expect(sources.map(s => [s.value, s.feedUrl ?? null, s.error ?? null, s.checkedAt ?? null])).toEqual([
			[B, B, null, NOW],
			['https://blog-c.example.org', null, 'No RSS or Atom feed found', NOW],
			['https://off.example.com', null, null, null],
			[A, `${A}/feed/`, null, NOW],
		]);
	});

	it('reads only the first feed page once its articles are stored, from the stored feed', async () => {
		const result = await service.scrapeCity(berlin, NOW);

		expect(result.saved).toBe(0);
		const asked = get.mock.calls.map(([url]) => url);
		expect(asked.filter(url => !url.includes('blog-c')).sort()).toEqual([B, `${A}/feed/`]);
	});
});
