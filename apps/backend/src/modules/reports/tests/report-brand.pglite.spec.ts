import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { Report } from '../entities/report.entity.js';
import { ReportService } from '../services/report.service.js';

const HIGHLIGHTS = { title: 'A month', headline: 'Fine.', highlights: [], actions: [] };

describe('ReportService.build for a brand (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportService;
	const highlightsAgent = mockAgent(HIGHLIGHTS);
	const replyAgent = mockAgent({ replies: [] });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				CompetitorService,
				BrandService,
				CityService,
				{ provide: ReportHighlightsAgent, useValue: highlightsAgent },
				{ provide: ReviewReplyAgent, useValue: replyAgent },
			],
		});
		service = harness.moduleRef.get(ReportService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("covers every branch's posts and reviews, and lists each branch's own month", async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create({ name: 'Berlin' });
		const brand = await brandFactory.create({ name: 'Burgermeister' });
		const branch = (name: string, reviewsCount: number, extra: Partial<Venue> = {}) =>
			venueFactory.build(
				{ name, reviewsCount, district: 'Friedrichshain-Kreuzberg', category: 'Hamburger restaurant', ...extra },
				{ associations: { city, brand } },
			);
		// The most reviewed: first in the report's branches
		const main = branch('Burgermeister Schlesisches Tor', 17617);
		const kotti = branch('Burgermeister Kottbusser Tor', 8310);
		// Another city's branch is no part of this report
		const hamburg = await cityFactory.create({ name: 'Hamburg' });
		const elsewhere = venueFactory.build(
			{ name: 'Burgermeister', category: 'Hamburger restaurant' },
			{ associations: { city: hamburg, brand } },
		);
		const neighbour = venueFactory.build(
			{ name: 'Hisar', district: 'Friedrichshain-Kreuzberg', category: 'Kebab shop' },
			{ associations: { city } },
		);

		// The brand's own account
		const own = ownAccount(em, brand, city, 'burgermeister.berlin');
		let n = 0;
		// `brandOnly`: the post named the brand but no branch, so the mention has no venue
		const post = (venues: { venue: Venue; brandOnly?: boolean }[], author: string) => {
			const p = em.create(SocialPost, {
				city: venues[0].venue.city,
				externalId: `b${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/b${n}`,
				postedAt: new Date('2026-09-10T00:00:00Z'),
				author,
				account: author === own.handle ? own : undefined,
				views: 1000,
			});
			for (const { venue, brandOnly = false } of venues)
				em.create(Mention, {
					post: p,
					venueName: venue.name,
					brand: venue.brand,
					venue: brandOnly ? null : venue,
					matchMethod: MentionMatchMethodEnum.EXACT,
					visited: true,
					sentiment: 'positive',
					summary: 'Good.',
					dishes: [],
					praise: [],
					complaints: [],
				});
		};
		post([{ venue: main, brandOnly: true }], 'a');
		post([{ venue: main, brandOnly: true }], 'b');
		post([{ venue: kotti }], 'c');
		post([{ venue: main }], 'd');
		// The brand's own account, posting as the bare brand
		post([{ venue: main, brandOnly: true }], 'burgermeister.berlin');
		post([{ venue: elsewhere }], 'e');
		post([{ venue: neighbour }], 'f');
		let r = 0;
		for (const [venue, stars] of [
			[main, 5],
			[kotti, 2],
			[kotti, 3],
		] as const)
			em.create(Review, {
				reviewId: `r${++r}`,
				venue,
				publishedAt: new Date('2026-09-12T00:00:00Z'),
				stars,
				text: 'Burgers.',
			});
		await em.flush();

		const report = await service.build(brand.id, city.id, '2026-09');

		// Every Berlin branch's posts by others, the own account apart
		expect(report.data.social.postCount).toBe(4);
		expect(report.data.ownPosts).toHaveLength(1);
		expect(report.data.reviews.count).toBe(3);
		expect(report.data.brand).toEqual({
			id: brand.id,
			name: 'Burgermeister',
			category: 'Hamburger restaurant',
			brandOnlyPosts: 2,
		});
		// One place entry per branch, each with its own month and place figures
		expect(report.data.branches).toMatchObject([
			{ venueId: main.id, social: { postCount: 1 }, reviews: { count: 1 }, ratingTrend: [] },
			{ venueId: kotti.id, social: { postCount: 1 }, reviews: { count: 2 }, ratingTrend: [] },
		]);
		// Nothing stands in for the brand any more
		expect(JSON.stringify(report.data)).not.toContain('described');
		expect(report.data).not.toHaveProperty('venue');
		// A sibling is no neighbour, in either branch's district
		expect(report.data.branches.map(b => b.neighbours.map(nb => nb.name))).toEqual([['Hisar'], ['Hisar']]);
		// The model gets every place on its own, and the brand
		const input = JSON.parse(highlightsAgent.generate.mock.calls.at(-1)![0] as string);
		expect(input.brand).toEqual({ name: 'Burgermeister', postsNamingNoBranch: 2 });
		expect(input.places.map((p: { name: string }) => p.name)).toEqual([main.name, kotti.name]);
		expect(input.places[1]).toMatchObject({ postsByOthersNamingIt: 1, neighbours: [{ name: 'Hisar' }] });

		// Each city its own report: Hamburg's has its one branch and its post
		const inHamburg = await service.build(brand.id, hamburg.id, '2026-09');
		expect(inHamburg.id).not.toBe(report.id);
		expect(inHamburg.data.branches.map(b => b.venueId)).toEqual([elsewhere.id]);
		expect(inHamburg.data.social.postCount).toBe(1);
		expect(inHamburg.data.brand.brandOnlyPosts).toBe(0);
		// A single place: the prompt has no branch comparison
		expect(JSON.parse(highlightsAgent.generate.mock.calls.at(-1)![0] as string).brand).toBeUndefined();
		expect(await em.count(Report, { brand })).toBe(2);
		// A rebuild replaces the city's row
		await service.build(brand.id, city.id, '2026-09');
		expect(await em.count(Report, { brand })).toBe(2);
		expect((await service.forBrand(brand.id, { cityId: hamburg.id })).map(r => r.id)).toEqual([inHamburg.id]);
	});

	it('builds one report across all the cities (city null), its branches named by city, without a city section', async () => {
		const em = harness.orm.em;
		const brand = await em.findOneOrFail(Brand, { name: 'Burgermeister' });
		const across = await service.build(brand.id, null, '2026-09');
		expect(across.city ?? null).toBeNull();
		// Berlin's four posts by others and Hamburg's one; every branch's reviews
		expect(across.data.social.postCount).toBe(5);
		expect(across.data.reviews.count).toBe(3);
		expect(across.data.city).toBeUndefined();
		// Every branch, the most reviewed first, named by city; no city calendar across cities
		expect(across.data.context).toBeUndefined();
		expect(across.data.branches.map(b => [b.name, b.city])).toEqual([
			['Burgermeister Schlesisches Tor', 'Berlin'],
			['Burgermeister Kottbusser Tor', 'Berlin'],
			['Burgermeister', 'Hamburg'],
		]);
		// The model is told both cities
		expect(highlightsAgent.generate.mock.calls.at(-1)![1]).toEqual({ cityName: 'Berlin, Hamburg' });

		// A rebuild finds the city-less row again: the null key is not unique in Postgres
		const again = await service.build(brand.id, null, '2026-09');
		expect(again.id).toBe(across.id);
		expect(await em.count(Report, { brand, city: null })).toBe(1);
		expect((await service.forBrand(brand.id, { cityId: null })).map(r => r.id)).toEqual([across.id]);
		// The city reports stay as they were
		expect(await em.count(Report, { brand })).toBe(3);
	});
});
