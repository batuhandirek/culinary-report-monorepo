import { NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { SitemapService } from 'src/modules/sitemap/services/sitemap.service.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { ownAccount, socialAccountFactory } from 'src/modules/social/tests/factories/social-account.factory.js';
import { TrendService } from 'src/modules/trends/services/trend.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { CityHighlightService } from '../services/city-highlight.service.js';
import { embedUrlOf } from '../util/highlights.js';

describe('CityHighlightService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: CityHighlightService;
	let sitemap: SitemapService;
	let city: City;
	const AFTER_SEPTEMBER = new Date('2026-10-03T08:00:00Z');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				CityHighlightService,
				CityService,
				TrendService,
				FoodTopicService,
				MentionMatchingService,
				SitemapService,
			],
		});
		service = harness.moduleRef.get(CityHighlightService);
		sitemap = harness.moduleRef.get(SitemapService);
		service.onModuleInit();
		entityManagerManager.setEntityManager(harness.orm.em);
		seedFoodTopics(harness.orm.em);

		const em = harness.orm.em;
		city = testCity(em, {
			slug: 'berlin',
			doNotListVenues: ['Quiet Corner'],
			doNotListCreators: ['@Shy.Creator'],
		});
		const wien = testCity(em, { slug: 'wien', name: 'Wien' });
		const venue = (name: string, district: string, c = city) =>
			em.create(Venue, { city: c, placeId: name, name, category: 'Restaurant', district, reviewsCount: 10 });
		const sori = venue('Sori Ramen', 'Mitte');
		const doner = venue('Döner X', 'Neukölln');
		const quiet = venue('Quiet Corner', 'Mitte');
		const schnitzel = venue('Schnitzelwirt', 'Innere Stadt', wien);
		// Brands come with the flush
		await em.flush();

		const accounts = new Map<string, SocialAccount>([['soriramen', ownAccount(em, sori.brand, city, 'soriramen')]]);
		let n = 0;
		const post = (venues: Venue[], author: string, views: number, opts: { city?: City; day?: string } = {}) => {
			const postCity = opts.city ?? city;
			const account =
				accounts.get(author) ??
				socialAccountFactory.build({ handle: author }, { associations: { city: postCity }, transient: { em } });
			accounts.set(author, account);
			const id = `7${String(++n).padStart(18, '0')}`;
			const p = em.create(SocialPost, {
				city: postCity,
				externalId: id,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://www.tiktok.com/@${author}/video/${id}`,
				author,
				account,
				views,
				postedAt: new Date(`2026-09-${opts.day ?? '10'}T12:00:00Z`),
			});
			for (const v of venues) {
				em.create(Mention, {
					post: p,
					venue: v,
					venueName: v.name,
					cuisine: 'Ramen',
					visited: true,
					sentiment: 'positive',
					summary: 'Good.',
				});
			}
		};
		// Sori: three posts by others; its own account posts twice with more views than anyone
		post([sori], 'anna', 1_000);
		post([sori], 'ben', 2_000);
		post([sori, doner], 'cleo', 500);
		post([sori], 'soriramen', 90_000);
		post([sori], 'soriramen', 80_000);
		// Döner X: one more post by others
		post([doner], 'anna', 300);
		// Quiet Corner asked to be left out, and is talked about most
		for (let i = 0; i < 5; i++) post([quiet], `fan${i}`, 100);
		// A creator who asked to be left out has the month's most viewed post
		post([doner], 'shy.creator', 50_000);
		// Another city's talk stays there, also when a Berlin post names a Wien place
		for (let i = 0; i < 8; i++) post([schnitzel], `wiener${i}`, 5_000, { city: wien });
		post([schnitzel], 'dora', 40_000);
		// August, for the risers
		post([doner], 'anna', 100, { day: '10' });
		await em.flush();
		// Move the last post to August
		await em.getConnection().execute(`update social_posts set posted_at = '2026-08-10T12:00:00Z' where external_id = ?`, [
			`7${String(n).padStart(18, '0')}`,
		]);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('lists brands by posts from others, never own posts, denied venues or other cities', async () => {
		const highlight = await service.build(city.id, '2026-09');
		const { data } = highlight;
		expect(data.brands.map(b => [b.rank, b.name, b.posts, b.views, b.creators])).toEqual([
			[1, 'Döner X', 3, 50_800, 3],
			[2, 'Sori Ramen', 3, 3_500, 3],
		]);
		expect(data.brands[1].district).toBe('Mitte');
		expect(JSON.stringify(data)).not.toContain('Quiet Corner');
		expect(JSON.stringify(data)).not.toContain('Schnitzelwirt');
		// Every Berlin post by others counts in the totals, Quiet Corner's too; own posts never
		expect(data.totals).toMatchObject({ posts: 10, brands: 3 });
		expect(data.totals.views).toBe(1_000 + 2_000 + 500 + 300 + 500 + 50_000);
	});

	it('leaves the denied creator out of the top post and the creators', async () => {
		const { data } = await service.build(city.id, '2026-09');
		expect(data.topPost).toMatchObject({
			handle: 'ben',
			views: 2_000,
			profileUrl: 'https://www.tiktok.com/@ben',
			brands: [{ name: 'Sori Ramen' }],
		});
		expect(data.topPost?.embedUrl).toMatch(/^https:\/\/www\.tiktok\.com\/embed\/v2\/7\d+$/);
		expect(data.creators.map(c => c.handle).slice(0, 3)).toEqual(['ben', 'anna', 'cleo']);
		expect(data.creators).toHaveLength(5);
		expect(data.creators.find(c => c.handle === 'anna')).toMatchObject({ posts: 2, views: 1_300, brands: 2 });
		expect(JSON.stringify(data)).not.toContain('shy.creator');
		expect(JSON.stringify(data)).not.toContain('soriramen');
	});

	it('lists risers without denied venues', async () => {
		const { data } = await service.build(city.id, '2026-09');
		expect(data.risers.map(r => r.name)).toEqual(['Sori Ramen']);
		expect(data.district).toMatchObject({ name: 'Mitte' });
	});

	it('answers 404 until published, then shows the month and lists it in the sitemap', async () => {
		const highlight = await service.build(city.id, '2026-09');
		await expect(service.published('berlin', '2026-09')).rejects.toBeInstanceOf(NotFoundException);
		expect((await sitemap.getEntries('highlights', 1, 100)).items).toEqual([]);

		await service.publish(highlight.id, AFTER_SEPTEMBER);
		const published = await service.published('berlin', '2026-09');
		expect(published.publishedAt).toEqual(AFTER_SEPTEMBER);
		expect((await sitemap.getEntries('highlights', 1, 100)).items.map(i => i.path)).toEqual(['/berlin/2026-09']);
		await expect(service.published('wien', '2026-09')).rejects.toBeInstanceOf(NotFoundException);

		// A rebuild keeps it published
		await service.build(city.id, '2026-09');
		expect((await service.published('berlin', '2026-09')).publishedAt).toEqual(AFTER_SEPTEMBER);

		await service.unpublish(highlight.id);
		await expect(service.published('berlin', '2026-09')).rejects.toBeInstanceOf(NotFoundException);
		expect((await sitemap.getEntries('highlights', 1, 100)).totalItems).toBe(0);
	});

	it('refuses to publish a month that is not over', async () => {
		const highlight = await service.build(city.id, '2026-09');
		await expect(service.publish(highlight.id, new Date('2026-09-28T00:00:00Z'))).rejects.toThrow(
			'A month is published once it is over',
		);
	});

	it('embeds through the platforms, never a re-hosted file', () => {
		expect(embedUrlOf(SocialPlatformEnum.TIKTOK, '7123', 'https://www.tiktok.com/@a/video/7123')).toBe(
			'https://www.tiktok.com/embed/v2/7123',
		);
		expect(embedUrlOf(SocialPlatformEnum.INSTAGRAM, 'ig_1', 'https://www.instagram.com/reel/DAbc-12/')).toBe(
			'https://www.instagram.com/p/DAbc-12/embed',
		);
		expect(embedUrlOf(SocialPlatformEnum.INSTAGRAM, 'ig_1', 'https://www.instagram.com/someone/')).toBeNull();
	});
});
