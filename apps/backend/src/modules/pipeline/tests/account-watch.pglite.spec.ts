import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { AccountScrapeService } from 'src/modules/social/services/account-scrape.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import { ownAccount, socialAccountFactory } from 'src/modules/social/tests/factories/social-account.factory.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { AdminCreatorWatchController } from '../controllers/admin.creator-watch.controller.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { AccountWatchService, WatchReasonKindEnum } from '../services/account-watch.service.js';
import { PipelineService } from '../services/pipeline.service.js';

const MONTH = '2026-09';

describe('AccountWatchService (pglite)', () => {
	let harness: PgliteTestingModule;
	let watch: AccountWatchService;
	let pipeline: PipelineService;
	let berlin: City;
	let wien: City;
	const brands: Record<string, Brand> = {};
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	const scrape = jest.fn(async (..._args: any[]) => ({ accounts: 0, profiles: 0, snapshots: 0, found: 0, saved: 0 }));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AdminCreatorWatchController,
				PipelineService,
				AccountWatchService,
				CompetitorService,
				CityService,
				ProspectQueryService,
				BrandService,
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: AccountScrapeService, useValue: { scrape } },
				{ provide: OwnAccountService, useValue: { addProspectHandles: async () => ({ created: 0 }) } },
			],
		});
		watch = harness.moduleRef.get(AccountWatchService);
		pipeline = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		berlin = testCity(em, { name: 'Berlin', cronEnabled: true, instagramEnabled: true, topBrands: 20 });
		wien = testCity(em, { name: 'Wien', cronEnabled: true, instagramEnabled: false });
		const venue = (name: string, city = berlin) => em.create(Venue, { city, placeId: `place-${name}`, name, category: 'Restaurant' });
		const places = {
			customer: venue('Customer'),
			buzzing: venue('Buzzing'),
			rival: venue('Rival'),
			place: venue('Competing place'),
			outsider: venue('Outsider'),
		};
		// Saved first: each venue gets a brand of its own
		await em.flush();
		for (const [key, v] of Object.entries(places)) brands[key] = v.brand;
		// Buzzing has a branch in Wien whose own account belongs there
		const wienBranch = em.create(Venue, { city: wien, brand: brands.buzzing, placeId: 'place-buzzing-wien', name: 'Buzzing Wien' });
		em.create(Prospect, { brand: brands.customer, stage: ProspectStageEnum.WON });
		// The customer's rival is a whole brand, buzzing's competitor is one place
		em.create(BrandCompetitor, { brand: brands.customer, rival: brands.rival });
		em.create(BrandCompetitor, { brand: brands.buzzing, venue: places.place });
		ownAccount(em, brands.customer, berlin, 'customer_ig', SocialPlatformEnum.INSTAGRAM);
		ownAccount(em, brands.buzzing, berlin, 'buzzing_tt', SocialPlatformEnum.TIKTOK);
		ownAccount(em, brands.buzzing, berlin, 'buzzing.wien', SocialPlatformEnum.INSTAGRAM).branch = wienBranch;
		ownAccount(em, brands.rival, berlin, 'rival_ig', SocialPlatformEnum.INSTAGRAM);
		ownAccount(em, brands.place, berlin, 'place_tt', SocialPlatformEnum.TIKTOK);
		ownAccount(em, brands.outsider, berlin, 'outsider', SocialPlatformEnum.TIKTOK);
		socialAccountFactory.build(
			{ handle: 'berlingoodfood', platform: SocialPlatformEnum.TIKTOK },
			{ associations: { city: berlin }, transient: { em } },
		);
		// Creators the cities follow: one on, one switched off, one in a city with Instagram off,
		// one that never posted for us
		testCitySource(em, berlin, CitySourceKindEnum.TIKTOK_ACCOUNT, 'berlingoodfood');
		testCitySource(em, berlin, CitySourceKindEnum.INSTAGRAM_ACCOUNT, 'paused_creator', false);
		testCitySource(em, berlin, CitySourceKindEnum.INSTAGRAM_ACCOUNT, 'new_creator');
		testCitySource(em, wien, CitySourceKindEnum.INSTAGRAM_ACCOUNT, 'berlingoodfood');
		await em.flush();
		topBrandIds.mockImplementation(async (_month, _top, cityId) => (cityId === berlin.id ? [brands.buzzing.id] : []));
	});

	afterAll(async () => {
		await harness.stop();
	});

	const berlinList = async () =>
		watch.watchList(berlin, await pipeline.topBrands(berlin, MONTH), { month: MONTH, top: berlin.topBrands });

	it("watches the city's creators, the report brands' own accounts and their rivals', each with its reasons", async () => {
		const list = await berlinList();
		const byHandle = new Map(list.map(w => [w.handle, w]));
		expect([...byHandle.keys()].sort()).toEqual(
			['berlingoodfood', 'buzzing_tt', 'customer_ig', 'new_creator', 'paused_creator', 'place_tt', 'rival_ig'].sort(),
		);
		expect(byHandle.get('berlingoodfood')!.reasons).toEqual([
			expect.objectContaining({ kind: WatchReasonKindEnum.CITY_SOURCE, active: true, enabled: true, city: { id: berlin.id, name: 'Berlin' } }),
		]);
		// A creator the city follows before any post of theirs is stored: no account yet
		expect(byHandle.get('new_creator')).toMatchObject({ platform: SocialPlatformEnum.INSTAGRAM });
		expect(byHandle.get('new_creator')!.accountId).toBeUndefined();
		expect(byHandle.get('paused_creator')!.reasons).toEqual([expect.objectContaining({ active: false, enabled: false })]);
		expect(byHandle.get('customer_ig')!.reasons).toEqual([
			expect.objectContaining({ kind: WatchReasonKindEnum.CUSTOMER, active: true, brand: { id: brands.customer.id, name: 'Customer' } }),
		]);
		expect(byHandle.get('buzzing_tt')!.reasons).toEqual([
			expect.objectContaining({ kind: WatchReasonKindEnum.TOP_BRAND, rank: 1, top: 20, month: MONTH }),
		]);
		expect(byHandle.get('rival_ig')!.reasons).toEqual([
			expect.objectContaining({ kind: WatchReasonKindEnum.RIVAL, rivalOf: [{ id: brands.customer.id, name: 'Customer' }] }),
		]);
		expect(byHandle.get('place_tt')!.reasons).toEqual([
			expect.objectContaining({ kind: WatchReasonKindEnum.RIVAL, rivalOf: [{ id: brands.buzzing.id, name: 'Buzzing' }] }),
		]);
		// Only active reasons get a profile scraped; the counts say what brought them in
		expect(watch.targets(list).map(t => t.handle).sort()).toEqual(
			['berlingoodfood', 'buzzing_tt', 'customer_ig', 'new_creator', 'place_tt', 'rival_ig'].sort(),
		);
		expect(watch.summary(list)).toEqual({ city_source: 2, customer: 1, top_brand: 1, rival: 2 });
	});

	it("leaves an Instagram creator waiting where the city has Instagram off, and a branch's account to its own city", async () => {
		const list = await watch.watchList(wien, await pipeline.topBrands(wien, MONTH), { month: MONTH, top: 20 });
		const byHandle = new Map(list.map(w => [w.handle, w]));
		expect(byHandle.get('berlingoodfood')!.reasons).toEqual([
			expect.objectContaining({ kind: WatchReasonKindEnum.CITY_SOURCE, active: false, enabled: true, instagramOff: true }),
		]);
		// Buzzing is no report brand in Wien; its Wien branch's account is not watched in Berlin either
		expect(byHandle.has('buzzing.wien')).toBe(false);
		expect((await berlinList()).some(w => w.handle === 'buzzing.wien')).toBe(false);
		expect(watch.targets(list)).toEqual([]);
	});

	it("tells a creator's page why each of their profiles is watched, in every cron city", async () => {
		const em = harness.orm.em;
		const controller = harness.moduleRef.get(AdminCreatorWatchController);
		const creator = await em.findOneOrFail(SocialAccount, { handle: 'berlingoodfood' }, { populate: ['creator'] });
		const out = await controller.getCreatorWatch(creator.creator.id, { month: MONTH });
		expect(out.month).toBe(MONTH);
		expect(out.accounts).toEqual([
			{
				accountId: creator.id,
				platform: SocialPlatformEnum.TIKTOK,
				handle: 'berlingoodfood',
				reasons: [expect.objectContaining({ kind: WatchReasonKindEnum.CITY_SOURCE, active: true, city: { id: berlin.id, name: 'Berlin' } })],
			},
		]);
		const outsider = await em.findOneOrFail(SocialAccount, { handle: 'outsider' }, { populate: ['creator'] });
		expect((await controller.getCreatorWatch(outsider.creator.id, { month: MONTH })).accounts[0].reasons).toEqual([]);
		await expect(controller.getCreatorWatch('00000000-0000-4000-8000-000000000000', {})).rejects.toThrow();
	});

	it('the monthly step scrapes the watched profiles with the month snapshot, the weekly one the last week', async () => {
		const em = harness.orm.em;
		const run = async (step: PipelineStepEnum) => {
			const created = em.create(PipelineRun, { city: berlin, step, month: MONTH, params: {}, status: PipelineRunStatusEnum.QUEUED });
			await em.flush();
			await pipeline.execute(created.id);
			em.clear();
			return em.findOneOrFail(PipelineRun, { id: created.id });
		};
		const monthly = await run(PipelineStepEnum.SCRAPE_ACCOUNTS);
		expect(monthly.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(monthly.result?.['1. SCRAPE_ACCOUNTS']).toMatchObject({ watched: { city_source: 2, customer: 1, top_brand: 1, rival: 2 } });
		const [, targets, opts] = scrape.mock.calls[0];
		expect((targets as { handle: string }[]).map(t => t.handle).sort()).toEqual(
			['berlingoodfood', 'buzzing_tt', 'customer_ig', 'new_creator', 'place_tt', 'rival_ig'].sort(),
		);
		expect(opts).toMatchObject({ since: `${MONTH}-01T00:00:00.000Z`, latestTen: true, budgetUsd: 4 });

		const weekly = await run(PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT);
		expect(weekly.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		const weeklyOpts = scrape.mock.calls[1][2] as { since: string; latestTen?: boolean; budgetUsd: number };
		expect(weeklyOpts.latestTen).toBeUndefined();
		expect(weeklyOpts.budgetUsd).toBe(2);
		expect(Date.now() - new Date(weeklyOpts.since).getTime()).toBeGreaterThan(7.9 * 24 * 3600 * 1000);
	});
});
