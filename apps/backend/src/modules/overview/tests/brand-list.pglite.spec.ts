import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from 'src/modules/pipeline/entities/pipeline-run.entity.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type { ReportData, ReportHighlights } from 'src/modules/reports/interfaces/report-data.interface.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { socialAccountFactory } from 'src/modules/social/tests/factories/social-account.factory.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { BrandListService } from '../services/brand-list.service.js';
import { BrandSummaryService } from '../services/brand-summary.service.js';
import { DataCoverageService } from '../services/data-coverage.service.js';

describe('Brand list, brand summary and data coverage (pglite)', () => {
	let harness: PgliteTestingModule;
	let list: BrandListService;
	let summary: BrandSummaryService;
	let coverage: DataCoverageService;
	let city: City;
	let doner: Venue;
	let chain: Brand;
	let quiet: Venue;
	const now = new Date('2026-10-18T12:00:00Z');
	let postSeq = 0;

	// One account per author, as saving a scraped post makes it
	const accounts = new Map<string, SocialAccount>();
	const accountOf = (author: string) => {
		const account =
			accounts.get(author) ??
			socialAccountFactory.build({ handle: author }, { associations: { city }, transient: { em: harness.orm.em } });
		accounts.set(author, account);
		return account;
	};
	const post = (author: string, postedAt: string, views: number) =>
		harness.orm.em.create(SocialPost, {
			city,
			externalId: `bl-${++postSeq}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/${postSeq}`,
			postedAt: new Date(postedAt),
			author,
			account: accountOf(author),
			views,
			analysedAt: new Date(postedAt),
		});
	const mention = (p: SocialPost, venue: Venue | null, brand: Brand) =>
		harness.orm.em.create(Mention, {
			post: p,
			venueName: brand.name,
			visited: true,
			sentiment: 'positive',
			summary: `About ${brand.name}`,
			brand,
			venue,
			matchMethod: MentionMatchMethodEnum.EXACT,
			matchedAt: new Date(),
		});
	const review = (venue: Venue, publishedAt: string, stars: number, extra: Partial<Review> = {}) =>
		harness.orm.em.create(Review, {
			venue,
			reviewId: `r-${Math.random()}`,
			publishedAt: new Date(publishedAt),
			stars,
			text: 'Written',
			...extra,
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [BrandListService, BrandSummaryService, DataCoverageService],
		});
		list = harness.moduleRef.get(BrandListService);
		summary = harness.moduleRef.get(BrandSummaryService);
		coverage = harness.moduleRef.get(DataCoverageService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;

		city = await cityFactory.create({ name: 'Berlin' });
		doner = venueFactory.build(
			{
				name: 'Döner Pro',
				reviewsCount: 333,
				rating: 4.8,
				district: 'Kreuzberg',
				details: { reviewsTags: [{ title: 'vegan meat', count: 12 }, { title: 'Dürüm', count: 7 }] },
			},
			{ associations: { city } },
		);
		chain = brandFactory.build({ name: 'Burgermeister' });
		venueFactory.build(
			{ name: 'Burgermeister Kotti', reviewsCount: 900, rating: 4.5, district: 'Kreuzberg', category: 'Hamburger restaurant' },
			{ associations: { city, brand: chain } },
		);
		venueFactory.build(
			{ name: 'Burgermeister Zoo', reviewsCount: 100, rating: 3.5, district: 'Charlottenburg', category: 'Hamburger restaurant' },
			{ associations: { city, brand: chain } },
		);
		quiet = venueFactory.build({ name: 'Quiet Café' }, { associations: { city } });
		await em.flush();

		// September: three creators on Döner Pro (one twice), its own account once; August: one
		const sep1 = post('creator_a', '2026-09-03T10:00:00Z', 1000);
		const sep2 = post('creator_b', '2026-09-12T10:00:00Z', 5000);
		const sep3 = post('creator_a', '2026-09-20T10:00:00Z', 200);
		// Döner Pro's own account: the matcher (or an admin) linked it
		accountOf('donerpro').brand = doner.brand;
		const own = post('donerpro', '2026-09-21T10:00:00Z', 9999);
		const aug = post('creator_c', '2026-08-10T10:00:00Z', 300);
		for (const p of [sep1, sep2, sep3, own, aug]) mention(p, doner, doner.brand);
		// The chain: one post naming the brand only
		mention(post('creator_d', '2026-09-05T10:00:00Z', 700), null, chain);

		review(doner, '2026-09-04T10:00:00Z', 5);
		review(doner, '2026-09-06T10:00:00Z', 2);
		review(doner, '2026-09-07T10:00:00Z', 1, { ownerResponse: 'Sorry' });
		review(doner, '2026-08-07T10:00:00Z', 4);

		em.create(Prospect, { brand: doner.brand, stage: ProspectStageEnum.TO_CONTACT });
		em.create(Prospect, { brand: chain, stage: ProspectStageEnum.WON });
		em.create(Report, {
			brand: doner.brand,
			city,
			month: '2026-09',
			data: {} as ReportData,
			highlights: { title: 'Food wins', headline: 'Strong month', highlights: [], actions: [] } as ReportHighlights,
			postCount: 3,
			reviewCount: 3,
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("lists the month's talked-about brands with posts by others, its own left out", async () => {
		const res = await list.list({ page: 1, size: 25, cityId: city.id, month: '2026-09' }, now);

		expect(res.segments).toEqual({ talked: 2, all: 3, prospects: 1, customers: 1, chains: 1 });
		expect(res.items.map(i => i.name)).toEqual(['Döner Pro', 'Burgermeister']);
		const [row] = res.items;
		expect(row.month).toMatchObject({ posts: 3, views: 6200, creators: 2, ownPosts: 1, reviews: 3, unanswered: 1 });
		expect(row.month.stars).toBeCloseTo(2.67, 2);
		expect(row.previous).toEqual({ posts: 1, views: 300 });
		expect(row.prospect?.stage).toBe(ProspectStageEnum.TO_CONTACT);
		expect(row.report?.id).toBeTruthy();
		expect(row).toMatchObject({ districts: ['Kreuzberg'], category: 'Restaurant', rating: 4.8, reviewsCount: 333 });
	});

	it('shows a chain as the brand: its branches, districts, shared category and stars over all their reviews', async () => {
		const res = await list.list({ page: 1, size: 25, cityId: city.id, month: '2026-09', segment: 'chains' }, now);

		expect(res.items).toHaveLength(1);
		expect(res.items[0]).toMatchObject({
			name: 'Burgermeister',
			branches: 2,
			category: 'Hamburger restaurant',
			// (4.5 × 900 + 3.5 × 100) / 1000
			rating: 4.4,
			reviewsCount: 1000,
			month: { posts: 1 },
			prospect: { stage: ProspectStageEnum.WON },
		});
		expect(res.items[0].districts.sort()).toEqual(['Charlottenburg', 'Kreuzberg']);
	});

	it('searches branch names, and pages every brand on "all"', async () => {
		const byBranch = await list.list({ page: 1, size: 25, cityId: city.id, month: '2026-09', segment: 'all', q: 'zoo' }, now);
		expect(byBranch.items.map(i => i.name)).toEqual(['Burgermeister']);

		const all = await list.list({ page: 1, size: 2, cityId: city.id, month: '2026-09', segment: 'all', sort: 'name:asc' }, now);
		expect(all.totalItems).toBe(3);
		expect(all.items.map(i => i.name)).toEqual(['Burgermeister', 'Döner Pro']);
		expect(quiet.brand.id).toBeTruthy();
	});

	it("sums up a brand's month, its six months and what to do", async () => {
		const res = await summary.summary(doner.brand.id, { cityId: city.id, month: '2026-09' }, now);

		expect(res.figures).toMatchObject({ posts: 3, ownPosts: 1, reviews: 3, unanswered: 1 });
		expect(res.series.map(s => s.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
		expect(res.series.at(-2)).toMatchObject({ posts: 1, reviews: 1 });
		// Most viewed first, its own account's post left out
		expect(res.topPosts.map(p => p.author)).toEqual(['creator_b', 'creator_a', 'creator_a']);
		expect(res.report).toMatchObject({ month: '2026-09', title: 'Food wins' });
		expect(res.todos.map(t => t.key)).toEqual(['unanswered', 'competitors']);
		expect(res.reviewTags).toEqual([
			{ title: 'vegan meat', count: 12 },
			{ title: 'Dürüm', count: 7 },
		]);
		expect(res.todos[0]).toMatchObject({ tone: 'info', tab: 'reviews' });
	});

	it("flags a customer's missing report, the posts naming no branch and reviews never scraped", async () => {
		const res = await summary.summary(chain.id, { cityId: city.id, month: '2026-09' }, now);
		expect(res.brandOnlyPosts).toBe(1);
		expect(res.todos.map(t => [t.key, t.tone])).toEqual([
			['report', 'urgent'],
			['competitors', 'todo'],
			['brand-only', 'info'],
			// 1,300 Google reviews between its branches, none stored for September: not scraped
			['reviews-missing', 'info'],
		]);
	});

	it("reads each month's stored data and every monthly step's latest attempt", async () => {
		const em = harness.orm.em;
		em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SCRAPE_REVIEWS,
			month: '2026-09',
			status: PipelineRunStatusEnum.FAILED,
			error: 'cap',
			createdAt: new Date('2026-10-02T06:00:00Z'),
		});
		em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SCRAPE_TIKTOK,
			month: '2026-09',
			status: PipelineRunStatusEnum.SUCCEEDED,
			result: { '1. SCRAPE_TIKTOK': { found: 20, saved: 5 } },
			createdAt: new Date('2026-10-02T07:00:00Z'),
		});
		await em.flush();

		const res = await coverage.coverage(city.id, 3, now);

		expect(res.reportMonth).toBe('2026-09');
		expect(res.months.map(m => [m.month, m.inProgress])).toEqual([
			['2026-10', true],
			['2026-09', false],
			['2026-08', false],
		]);
		const september = res.months[1];
		expect(september).toMatchObject({
			complete: false,
			posts: { tiktok: 5, instagram: 0, unanalysed: 0 },
			mentions: { matched: 5, unmatched: 0, otherCity: 0 },
			reviews: { total: 3, venues: 1 },
			reports: { built: 1, sent: 0 },
		});
		const step = (name: PipelineStepEnum) => september.steps.find(s => s.step === name);
		expect(step(PipelineStepEnum.SCRAPE_TIKTOK)).toMatchObject({ state: 'succeeded', summary: 'found 20 · saved 5', paid: true });
		expect(step(PipelineStepEnum.SCRAPE_REVIEWS)).toMatchObject({ state: 'failed', error: 'cap' });
		expect(step(PipelineStepEnum.BUILD_REPORTS)?.state).toBeUndefined();
		expect(step(PipelineStepEnum.BUILD_REPORTS)?.paid).toBe(false);
	});
});
