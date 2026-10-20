import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { BrandMember } from 'src/modules/auth/entities/brand-member.entity.js';
import { userFactory } from 'src/modules/auth/tests/factories/user.factory.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type {
	ReportData,
	ReportHighlights,
} from 'src/modules/reports/interfaces/report-data.interface.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import {
	ownAccount,
	socialAccountFactory,
} from 'src/modules/social/tests/factories/social-account.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminBrandsController } from '../controllers/admin.brands.controller.js';
import { Brand, BrandReportScopeEnum } from '../entities/brand.entity.js';
import { BrandCompetitor } from '../entities/brand-competitor.entity.js';
import { BrandDismissal } from '../entities/brand-dismissal.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueLookup } from '../entities/venue-lookup.entity.js';
import { VenueSnapshot } from '../entities/venue-snapshot.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { BrandAutoMergeJob } from '../jobs/brand-auto-merge.job.js';
import { BrandChangedJob } from '../jobs/brand-changed.job.js';
import { BrandSearchJob } from '../jobs/brand-search.job.js';
import { BrandService } from '../services/brand.service.js';
import { VenueService } from '../services/venue.service.js';
import { BRAND_SEARCH_RESULTS, VenueScrapeService } from '../services/venue-scrape.service.js';

import { brandFactory } from './factories/brand.factory.js';
import { venueFactory } from './factories/venue.factory.js';
import { BURGERMEISTER_SEARCH_ITEMS } from './fixtures/brand-search-items.js';

describe('BrandService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: BrandService;
	let controller: AdminBrandsController;
	let berlin: City;
	let hamburg: City;
	const runActor = jest.fn(async (..._args: unknown[]): Promise<unknown[]> => []);
	const sendJob = jest.fn(async (..._args: unknown[]) => undefined);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				VenueScrapeService,
				VenueService,
				AdminBrandsController,
				{ provide: ApifyService, useValue: { runActor } },
				{ provide: PgBossService, useValue: { sendJob } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		service = harness.moduleRef.get(BrandService);
		controller = harness.moduleRef.get(AdminBrandsController);
		berlin = await cityFactory.create({ name: 'Berlin', nameStopwords: ['berlin'] });
		hamburg = await cityFactory.create({
			name: 'Hamburg',
			locationQuery: 'Hamburg, Germany',
			nameStopwords: ['hamburg'],
		});
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		const em = harness.orm.em;
		await em.nativeDelete(Mention, {});
		await em.nativeDelete(SocialPost, {});
		await em.nativeDelete(BrandCompetitor, {});
		await em.nativeDelete(BrandMember, {});
		await em.nativeDelete(Prospect, {});
		await em.nativeDelete(Report, {});
		await em.nativeDelete(BrandDismissal, {});
		await em.nativeDelete(VenueSnapshot, {});
		await em.nativeDelete(VenueStatusChange, {});
		await em.nativeDelete(VenueLookup, {});
		await em.nativeDelete(Venue, {});
		await em.nativeDelete(Brand, {});
		em.clear();
		runActor.mockClear();
		sendJob.mockClear();
	});

	const branch = (
		city: City,
		name: string,
		reviewsCount: number,
		extra: Partial<Venue> = {},
		brand?: Brand,
	) =>
		venueFactory.build(
			{ name, reviewsCount, category: 'Hamburger restaurant', ...extra },
			{ associations: { city, ...(brand && { brand }) } },
		);
	const brandOf = async (venue: Venue) =>
		(await harness.orm.em.findOneOrFail(Venue, { id: venue.id }, { populate: ['brand'] }))
			.brand;
	const report = (brand: Brand, city: City, month: string) =>
		harness.orm.em.create(Report, {
			brand,
			city,
			month,
			data: {} as ReportData,
			highlights: {
				title: month,
				headline: '',
				highlights: [],
				actions: [],
			} as unknown as ReportHighlights,
		});
	let n = 0;
	const mention = (venue: Venue) =>
		harness.orm.em.create(Mention, {
			post: harness.orm.em.create(SocialPost, {
				city: venue.city,
				externalId: `m${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/m${n}`,
				postedAt: new Date('2026-09-01T00:00:00Z'),
				views: 1,
			}),
			venueName: venue.name,
			venue,
			brand: venue.brand,
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
			dishes: [],
			praise: [],
			complaints: [],
		});

	it('gives a venue saved without a brand one of its own, named like it', async () => {
		const venue = branch(berlin, "Brammibal's Donuts (Maybachufer)", 2758);
		await harness.orm.em.flush();
		harness.orm.em.clear();
		const brand = await brandOf(venue);
		expect(brand).toMatchObject({
			name: "Brammibal's Donuts (Maybachufer)",
			key: 'brammibal s donuts',
		});
		// One branch nobody looked at is no chain
		expect(await service.list()).toEqual([]);
	});

	it("suggests a city's lone namesakes, suffixed branches included, and only that city's", async () => {
		branch(berlin, 'Burgermeister', 2330);
		branch(berlin, 'Burgermeister Leopoldplatz', 1418);
		branch(berlin, "Brammibal's Donuts", 2758, { category: 'Donut shop' });
		branch(berlin, "Brammibal's Donuts (Prenzlauer Berg)", 1510, { category: 'Donut shop' });
		branch(hamburg, 'Burgermeister', 300);
		branch(berlin, 'Peter Pane', 4204);
		await harness.orm.em.flush();

		const suggestions = await controller.listBrandSuggestions({ cityId: berlin.id });
		expect(suggestions.map(s => [s.name, s.reason, s.venues.map(v => v.name)])).toEqual([
			[
				"Brammibal's Donuts",
				'same name',
				["Brammibal's Donuts", "Brammibal's Donuts (Prenzlauer Berg)"],
			],
			['Burgermeister', 'name prefix', ['Burgermeister', 'Burgermeister Leopoldplatz']],
		]);
		// One Hamburg venue is no group on its own
		expect(await service.suggestions(hamburg.id)).toEqual([]);
	});

	it('never brings back a dismissed suggestion', async () => {
		branch(berlin, 'Curry 61', 900);
		branch(berlin, 'Curry 61', 400);
		await harness.orm.em.flush();
		const [suggestion] = await service.suggestions(berlin.id);
		await controller.dismissBrandSuggestion({
			name: suggestion.group.name,
			key: suggestion.group.key,
		});
		// Twice is a no-op
		await controller.dismissBrandSuggestion({
			name: suggestion.group.name,
			key: suggestion.group.key,
		});

		expect(await service.suggestions(berlin.id)).toEqual([]);
		expect(await harness.orm.em.find(BrandDismissal, {})).toMatchObject([
			{ key: 'curry 61', name: 'Curry 61' },
		]);
		expect(sendJob).not.toHaveBeenCalled();
	});

	it("merges venues' brands into a chain, queues the rematch, and offers another city's namesake without joining it", async () => {
		const main = branch(berlin, 'Burgermeister Schlesisches Tor', 17617);
		const other = branch(berlin, 'Burgermeister', 2330);
		const inHamburg = branch(hamburg, 'Burgermeister', 300);
		await harness.orm.em.flush();
		const before = [main.brand.id, other.brand.id];

		const brand = await controller.confirmBrand({
			name: 'Burgermeister',
			venueIds: [main.id, other.id],
		});
		expect(brand).toMatchObject({
			name: 'Burgermeister',
			key: 'burgermeister',
		});
		// No records: the biggest venue's brand stays, the other goes
		expect(brand.id).toBe(main.brand.id);
		expect(await harness.orm.em.count(Brand, { id: { $in: before } })).toBe(1);
		expect(brand.branches.map(b => b.name).sort()).toEqual([
			'Burgermeister',
			'Burgermeister Schlesisches Tor',
		]);
		expect(brand.candidates.map(c => [c.name, c.city.name])).toEqual([
			['Burgermeister', 'Hamburg'],
		]);
		expect(sendJob).toHaveBeenCalledWith(
			BrandChangedJob.jobName,
			expect.objectContaining({ payload: { brandIds: [brand.id], cityIds: [berlin.id] } }),
		);

		harness.orm.em.clear();
		expect((await brandOf(inHamburg)).id).not.toBe(brand.id);
		// Its branches no longer form a suggestion, and it is listed as a chain
		expect(await service.suggestions(berlin.id)).toEqual([]);
		expect((await service.list()).map(b => b.id)).toEqual([brand.id]);
		// Another chain under the same name is refused
		const lone = branch(berlin, 'Meister Burger', 10);
		await harness.orm.em.flush();
		await expect(
			service.merge({
				name: 'Burgermeister',
				venueIds: [lone.id],
			}),
		).rejects.toThrow('is a brand already');
	});

	it("moves the merged brands' reports, prospect, members, competitors and mentions onto the one with the prospect", async () => {
		const em = harness.orm.em;
		const kotti = branch(berlin, 'Burgermeister Kotti', 900);
		const mitte = branch(berlin, 'Burgermeister Mitte', 17000);
		const rival = branch(berlin, 'Hisar', 500);
		await em.flush();
		const user = await userFactory.create({ email: 'owner@example.com' });
		// The smaller one is the prospect: it stays
		em.create(Prospect, { brand: kotti.brand, stage: ProspectStageEnum.CONTACTED });
		report(kotti.brand, berlin, '2026-08');
		report(mitte.brand, berlin, '2026-08');
		report(mitte.brand, berlin, '2026-09');
		em.create(BrandMember, { user, brand: kotti.brand });
		em.create(BrandMember, { user, brand: mitte.brand });
		em.create(BrandCompetitor, { brand: mitte.brand, venue: rival });
		em.create(BrandCompetitor, { brand: kotti.brand, venue: rival });
		// Competition inside the new chain goes
		em.create(BrandCompetitor, { brand: kotti.brand, venue: mitte });
		// Another brand picked one of them as its rival: it now competes with the chain
		em.create(BrandCompetitor, { brand: rival.brand, rival: mitte.brand });
		mention(mitte);
		// Mitte's own account, an account suggested as it, and one said not to be it
		const own = ownAccount(em, mitte.brand, berlin, 'burgermeister.mitte');
		const suggested = socialAccountFactory.build(
			{ handle: 'bm_mitte', suggestedBrand: mitte.brand, suggestedScore: 0.8 },
			{ associations: { city: berlin }, transient: { em } },
		);
		const rejected = socialAccountFactory.build(
			{ handle: 'mitte.foodie', rejectedBrandIds: [mitte.brand.id] },
			{ associations: { city: berlin }, transient: { em } },
		);
		await em.flush();
		const keep = kotti.brand.id;
		const gone = mitte.brand.id;

		const brand = await service.merge({
			name: 'Burgermeister',
			venueIds: [kotti.id, mitte.id],
		});
		expect(brand.id).toBe(keep);
		em.clear();
		expect(await em.count(Brand, { id: gone })).toBe(0);
		expect(await em.findOneOrFail(Prospect, { brand: keep })).toMatchObject({
			stage: ProspectStageEnum.CONTACTED,
		});
		// August clashed: the kept brand's stays; September moves over
		expect(
			(await em.find(Report, { brand: keep }, { orderBy: { month: 'asc' } })).map(
				r => r.month,
			),
		).toEqual(['2026-08', '2026-09']);
		expect(await em.count(BrandMember, { brand: keep })).toBe(1);
		expect((await em.find(BrandCompetitor, { brand: keep })).map(c => c.venue?.id)).toEqual([
			rival.id,
		]);
		expect(await em.findOneOrFail(BrandCompetitor, { brand: rival.brand.id })).toMatchObject({
			rival: { id: keep },
		});
		expect(await em.findOneOrFail(Mention, { venue: mitte.id })).toMatchObject({
			brand: { id: keep },
		});
		// Its own accounts move to the chain; "not theirs" for a merged brand says nothing of the chain
		expect(await em.findOneOrFail(SocialAccount, { id: own.id })).toMatchObject({
			brand: { id: keep },
		});
		expect(await em.findOneOrFail(SocialAccount, { id: suggested.id })).toMatchObject({
			suggestedBrand: { id: keep },
		});
		expect(
			(await em.findOneOrFail(SocialAccount, { id: rejected.id })).rejectedBrandIds,
		).toEqual([]);
	});

	it('refuses to merge two prospects', async () => {
		const em = harness.orm.em;
		const a = branch(berlin, 'Curry 36', 900);
		const b = branch(berlin, 'Curry 36', 800);
		await em.flush();
		em.create(Prospect, { brand: a.brand });
		em.create(Prospect, { brand: b.brand });
		await em.flush();
		await expect(
			service.merge({
				name: 'Curry 36',
				venueIds: [a.id, b.id],
			}),
		).rejects.toThrow('2 of these brands are prospects');
	});

	it('adds a namesake from another city, and never offers one marked not a branch', async () => {
		const brand = await brandFactory.create({ name: 'Burgermeister' });
		branch(berlin, 'Burgermeister', 2330, {}, brand);
		const inHamburg = branch(hamburg, 'Burgermeister', 300);
		const stranger = branch(berlin, 'Burgermeister Döner', 12);
		await harness.orm.em.flush();

		await controller.excludeBrandVenue(brand.id, { venueId: stranger.id });
		const after = await controller.addBrandBranches(brand.id, { venueIds: [inHamburg.id] });
		expect(after.branches.map(b => b.city.name).sort()).toEqual(['Berlin', 'Hamburg']);
		expect(after.candidates).toEqual([]);
		expect(sendJob).toHaveBeenLastCalledWith(
			BrandChangedJob.jobName,
			expect.objectContaining({
				payload: expect.objectContaining({ cityIds: [hamburg.id] }),
			}),
		);
	});

	it('takes a branch off into a brand of its own, its mentions with it, and keeps the last one', async () => {
		const em = harness.orm.em;
		const brand = await brandFactory.create({ name: 'Burgermeister' });
		const kotti = branch(berlin, 'Burgermeister Kotti', 900, {}, brand);
		const mitte = branch(berlin, 'Burgermeister Mitte', 300, {}, brand);
		await em.flush();
		mention(mitte);
		report(brand, berlin, '2026-09');
		const branchAccount = ownAccount(em, brand, berlin, 'burgermeister_mitte');
		branchAccount.branch = mitte;
		await em.flush();

		const after = await controller.removeBrandBranch(brand.id, mitte.id);
		expect(after.branches.map(b => b.id)).toEqual([kotti.id]);
		em.clear();
		const own = await brandOf(mitte);
		expect(own).toMatchObject({ name: 'Burgermeister Mitte' });
		expect(await em.findOneOrFail(Mention, { venue: mitte.id })).toMatchObject({
			brand: { id: own.id },
		});
		// The branch's own account follows it
		expect(await em.findOneOrFail(SocialAccount, { id: branchAccount.id })).toMatchObject({
			brand: { id: own.id },
			branch: null,
		});
		// The report stays with the brand
		expect(await em.count(Report, { brand: brand.id })).toBe(1);
		// Taken off for good: never offered or joined again by itself
		expect((await em.findOneOrFail(Brand, { id: brand.id })).excludedVenueIds).toEqual([
			mitte.id,
		]);
		await expect(service.removeBranch(brand.id, kotti.id)).rejects.toThrow(
			"the brand's only branch",
		);
	});

	it("finds branches with one Google Maps search, saves every place, and the ones on the brand's site join it", async () => {
		const brand = await brandFactory.create({ name: 'Burgermeister' });
		const first = branch(
			berlin,
			'Burgermeister',
			2330,
			{ placeId: BURGERMEISTER_SEARCH_ITEMS[10].placeId },
			brand,
		);
		// Looked up before for an unmatched mention: the brand search runs anyway
		harness.orm.em.create(VenueLookup, { city: berlin, query: 'burgermeister', results: 3 });
		await harness.orm.em.flush();
		runActor.mockResolvedValueOnce(BURGERMEISTER_SEARCH_ITEMS);

		// "Find branches" only queues the search: it takes half a minute
		await controller.searchBrandBranches(brand.id, { cityId: berlin.id });
		expect(runActor).not.toHaveBeenCalled();
		expect(sendJob).toHaveBeenCalledWith(
			BrandSearchJob.jobName,
			new BrandSearchJob({ brandId: brand.id, cityId: berlin.id }),
		);

		const result = await service.searchBranches(brand.id, berlin.id);
		expect(runActor).toHaveBeenCalledWith(
			'compass/crawler-google-places',
			expect.objectContaining({
				searchStringsArray: ['Burgermeister'],
				locationQuery: 'Berlin, Germany',
				maxCrawledPlacesPerSearch: BRAND_SEARCH_RESULTS,
			}),
			expect.objectContaining({ maxCostUsd: 1 }),
		);
		// Every Burgermeister on burgermeister.com joined: nothing is left to offer
		expect(result).toEqual({ found: 40, saved: 40, candidates: 0 });

		// One branch is no chain: the bigger branch's brand may be the one that stays
		harness.orm.em.clear();
		const detail = await controller.getBrand((await brandOf(first)).id);
		const names = detail.branches.map(c => c.name);
		expect(names).toHaveLength(15);
		expect(names).toContain('Burgermeister Kottbusser Tor');
		expect(names).not.toContain("Golt'z Burger");
		expect(names).not.toContain('Peter Pane');
		// A grocery store with the name is no food venue
		expect(names).not.toContain('Burgermeister Produktion');
		expect(detail.candidates).toEqual([]);
		expect(Object.keys(detail.branchesSearchedAt)).toEqual([berlin.id]);
		expect(await harness.orm.em.count(Venue, { city: berlin })).toBe(40);
		// The scrape queued the city's merge too: it finds nothing left to do
		expect(sendJob).toHaveBeenCalledWith(
			BrandAutoMergeJob.jobName,
			new BrandAutoMergeJob({ cityId: berlin.id }),
			{
				singletonKey: berlin.id,
			},
		);
	});

	it('changes the report scope and splits a chain back into brands of their own', async () => {
		const brand = await brandFactory.create({ name: 'Nhas City Chicken' });
		const torstr = branch(berlin, 'Nhas City Chicken', 2451, {}, brand);
		const neukolln = branch(berlin, 'Nhas City Chicken Neukölln', 800, {}, brand);
		await harness.orm.em.flush();

		const updated = await controller.updateBrand(brand.id, {
			reportScope: BrandReportScopeEnum.ALL,
		});
		expect(updated.reportScope).toBe(BrandReportScopeEnum.ALL);
		expect(sendJob).toHaveBeenCalledTimes(1);

		const split = await controller.splitBrand(brand.id);
		// The most reviewed branch keeps the brand and its records
		expect(split.branches.map(b => b.id)).toEqual([torstr.id]);
		harness.orm.em.clear();
		expect((await brandOf(neukolln)).id).not.toBe(brand.id);
		expect(await service.list()).toEqual([]);
		// Not one brand, by an admin's word: no suggestion, nothing merged again
		expect((await harness.orm.em.find(BrandDismissal, {})).map(d => d.key)).toEqual([
			'nhas city chicken',
		]);
		expect(await service.suggestions(berlin.id)).toEqual([]);
	});

	describe('autoMerge', () => {
		const site = (url: string) => ({ website: url });

		it('makes a chain of the branches on one site named after the brand, and leaves the rest to an admin', async () => {
			// One site named after the brand: a chain, the branch without a site with it
			const lily = branch(
				berlin,
				'Lily Burger "Beef & Vegan Grill-Club“',
				2828,
				site('https://lily-burger.de/'),
			);
			const lily2 = branch(
				berlin,
				'Lily Burger "Beef & Vegan Grill-Club“',
				660,
				site('http://www.lily-burger.de/kreuzberg'),
			);
			const osteria = [
				branch(
					berlin,
					"L'Osteria Berlin Mahlsdorf",
					6108,
					site('https://losteria.net/de/restaurants/restaurant/berlin-mahlsdorf/'),
				),
				branch(berlin, "L'Osteria", 991, site('https://www.losteria.net/')),
				branch(
					berlin,
					"L'Osteria Berlin Koppenstraße",
					687,
					site('https://losteria.net/de/restaurants/restaurant/berlin-koppenstrasse/'),
				),
			];
			// A branch without a site goes along when the name says more than food
			const hut = [
				branch(berlin, 'Pizza Hut', 4670, site('https://www.pizzahut.de/')),
				branch(
					berlin,
					'Pizza Hut Berlin Oranienburger Strasse',
					614,
					site('https://pizzahut.de/'),
				),
				branch(berlin, 'Pizza Hut', 909),
			];
			// "Asia Haus" does not: with a place of the name but no site, the group waits for an admin
			branch(berlin, 'Asia Haus Berlin', 183, site('https://asia-haus-berlin.de/'));
			branch(berlin, 'Asia Haus Sushi Bar 65', 220, site('https://asia-haus-berlin.de/'));
			branch(berlin, 'Asia Haus', 35);
			// A listing site is named after nobody; a name alone, or two sites, prove nothing
			branch(
				berlin,
				"Crispy's Chicken Berlin (Lichtenberg)",
				486,
				site('https://speisekartenweb.de/restaurants/berlin/crispys-chicken-1'),
			);
			branch(
				berlin,
				"Crispy's Chicken Berlin (Schöneberg)",
				395,
				site('https://speisekartenweb.de/restaurants/berlin/crispys-chicken-2'),
			);
			branch(berlin, 'Roma', 1852);
			branch(berlin, 'Roma', 729);
			branch(berlin, 'Fukagawa Ramen', 661, site('https://fukagawa.de/'));
			branch(berlin, 'Fukagawa', 54, site('https://fukagawa-finedining.de/'));
			await harness.orm.em.flush();

			expect(await service.autoMerge(berlin.id)).toEqual({ joined: 0, merged: 3 });
			harness.orm.em.clear();
			const chains = await service.list();
			expect(chains.map(b => [b.name, b.branches.length])).toEqual([
				["L'Osteria", 3],
				['Pizza Hut', 3],
				['Lily Burger "Beef & Vegan Grill-Club“', 2],
			]);
			expect((await brandOf(lily2)).id).toBe((await brandOf(lily)).id);
			expect((await brandOf(osteria[2])).id).toBe((await brandOf(osteria[0])).id);
			expect((await brandOf(hut[2])).id).toBe((await brandOf(hut[0])).id);
			expect((await service.suggestions(berlin.id)).map(s => s.group.name).sort()).toEqual([
				'Asia Haus',
				"Crispy's Chicken Berlin",
				'Fukagawa',
				'Roma',
			]);
			// One rematch for the whole run
			expect(sendJob).toHaveBeenCalledTimes(1);
			expect(sendJob).toHaveBeenCalledWith(
				BrandChangedJob.jobName,
				expect.objectContaining({
					payload: {
						brandIds: expect.arrayContaining(chains.map(b => b.id)),
						cityIds: [berlin.id],
					},
				}),
			);
			// Done once: a second run finds nothing
			expect(await service.autoMerge(berlin.id)).toEqual({ joined: 0, merged: 0 });
		});

		it('lets a chain take new places of its name that give its site, but never one taken off', async () => {
			const brand = await brandFactory.create({ name: 'Burgermeister' });
			branch(
				berlin,
				'Burgermeister Schlesisches Tor',
				17617,
				site('http://www.burgermeister.com/'),
				brand,
			);
			branch(berlin, 'Burgermeister', 2330, site('https://burgermeister.com/'), brand);
			const zoo = branch(
				berlin,
				'Burgermeister Zoo',
				1687,
				site('https://burgermeister.com/zoo'),
			);
			const noSite = branch(berlin, 'Burgermeister Leopoldplatz', 687);
			const lookalike = branch(
				berlin,
				'Burgermeister Döner',
				80,
				site('https://burgermeister-doener.de/'),
			);
			// Another city: the same name on another ending joins; a place without a site waits
			// for a branch there
			const inHamburg = branch(
				hamburg,
				'Burgermeister Altona',
				3000,
				site('https://burgermeister.de/'),
			);
			const hamburgNoSite = branch(hamburg, 'Burgermeister Sternschanze', 300);
			await harness.orm.em.flush();

			expect(await service.autoMerge(berlin.id)).toEqual({ joined: 2, merged: 0 });
			expect(await service.autoMerge(hamburg.id)).toEqual({ joined: 1, merged: 0 });
			harness.orm.em.clear();
			const chain = await service.get(brand.id);
			expect(chain.branches.getItems().map(v => v.id)).toEqual(
				expect.arrayContaining([zoo.id, noSite.id, inHamburg.id]),
			);
			expect(chain.branches).toHaveLength(5);
			expect((await brandOf(lookalike)).id).not.toBe(brand.id);
			// With a branch in Hamburg now, the next run takes the one without a site
			expect(await service.autoMerge(hamburg.id)).toEqual({ joined: 1, merged: 0 });
			harness.orm.em.clear();
			expect((await brandOf(hamburgNoSite)).id).toBe(brand.id);

			// An admin takes one off: it stays off
			await service.removeBranch(brand.id, zoo.id);
			expect(await service.autoMerge(berlin.id)).toEqual({ joined: 0, merged: 0 });
			harness.orm.em.clear();
			expect((await brandOf(zoo)).id).not.toBe(brand.id);
		});

		it('never merges again what an admin split, and leaves two prospects to an admin', async () => {
			const a = branch(
				berlin,
				'Mmaah! - Korean Fried Chicken',
				1256,
				site('https://mmaah.de/'),
			);
			branch(berlin, 'Mmaah! - Eat Korean', 234, site('https://mmaah.de/'));
			const c = branch(berlin, 'Smack Burger', 1959, site('https://smackburgers.de/'));
			const d = branch(berlin, 'Smack Burger', 503, site('https://smackburgers.de/'));
			await harness.orm.em.flush();
			harness.orm.em.create(Prospect, { brand: c.brand });
			harness.orm.em.create(Prospect, { brand: d.brand });
			await harness.orm.em.flush();

			expect(await service.autoMerge(berlin.id)).toEqual({ joined: 0, merged: 1 });
			await service.split((await brandOf(a)).id);
			expect(await service.autoMerge(berlin.id)).toEqual({ joined: 0, merged: 0 });
			// The prospects' namesakes are still a suggestion
			expect((await service.suggestions(berlin.id)).map(s => s.group.name)).toEqual([
				'Smack Burger',
			]);
		});

		it('is queued for the city by every venue scrape', async () => {
			runActor.mockResolvedValueOnce([
				{ placeId: 'p1', title: 'Lily Burger', website: 'https://lily-burger.de/' },
				{ placeId: 'p2', title: 'Lily Burger', website: 'https://lily-burger.de/' },
			]);
			await harness.moduleRef
				.get(VenueScrapeService)
				.scrapeCity({ city: berlin, terms: ['restaurant'], maxPerTerm: 10, budgetUsd: 1 });
			expect(sendJob).toHaveBeenCalledWith(
				BrandAutoMergeJob.jobName,
				new BrandAutoMergeJob({ cityId: berlin.id }),
				{
					singletonKey: berlin.id,
				},
			);
		});
	});
});
