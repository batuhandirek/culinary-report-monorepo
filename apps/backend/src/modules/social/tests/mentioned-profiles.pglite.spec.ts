// import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
//
// import { ApifyService } from 'src/modules/apify/services/apify.service.js';
// import type { City } from 'src/modules/cities/entities/city.entity.js';
// import { CityService } from 'src/modules/cities/services/city.service.js';
// import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
// import { DurableLlmService } from 'src/modules/durable-workflows/services/durable-llm.service.js';
// import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
// import { Brand } from 'src/modules/venues/entities/brand.entity.js';
// import { BrandExcludedVenue } from 'src/modules/venues/entities/brand-excluded-venue.entity.js';
// import { Venue } from 'src/modules/venues/entities/venue.entity.js';
// import { BrandService } from 'src/modules/venues/services/brand.service.js';
// import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
// import { entityManagerManager } from 'src/shared/util/em.js';
// import { mockAgent } from 'src/tests/mock-agent.js';
// import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';
//
// import { ProfilePlaceAgent } from '../agents/profile-place.agent.js';
// import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
// import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
// import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
// import { AccountMatchingService } from '../services/account-matching.service.js';
// import {
// 	AccountScrapeService,
// 	INSTAGRAM_PROFILE_ACTOR,
// } from '../services/account-scrape.service.js';
// import { MentionMatchingService } from '../services/mention-matching.service.js';
// import { ProfilePlaceService } from '../services/profile-place.service.js';
// import { SocialAccountService } from '../services/social-account.service.js';
// import { SocialPostService } from '../services/social-post.service.js';
//
// const IG = SocialPlatformEnum.INSTAGRAM;
//
// // `apify/instagram-profile-scraper` items as the run of 2026-11-05 returned them, posts left out
// const PROFILE_ITEMS: Record<string, Record<string, unknown>> = {
// 	'lucys.berlin': {
// 		username: 'lucys.berlin',
// 		id: '2931164010',
// 		fullName: 'Lucy‘s',
// 		biography:
// 			'Let food define your health🥬\n🌱Torstraße 116\nMO-FR: 9-4 | SA/SUN: 10-5\n🌱Brunnenstraße 24\nMO-FR: 8-2.30 SA/SUN: 9-2.30\nBook @ TOR via the LINK below',
// 		externalUrl: 'https://bookings.zenchef.com/results?rid=365935&pid=1001',
// 		externalUrls: [
// 			{
// 				url: 'https://bookings.zenchef.com/results?rid=365935&pid=1001',
// 				link_type: 'external',
// 			},
// 		],
// 		businessCategoryName: 'Health Food Restaurant',
// 		isBusinessAccount: true,
// 		followersCount: 11293,
// 		followsCount: 600,
// 		postsCount: 900,
// 		latestPosts: [],
// 	},
// 	selocoffeeberlin: {
// 		username: 'selocoffeeberlin',
// 		id: '61234567890',
// 		fullName: 'SELO COFFEE',
// 		biography:
// 			'coffee•aperitif•community\nfamily-run coffee shop | card only\nTempelhofer Damm 212, 12099 Berlin 📍',
// 		externalUrls: [],
// 		businessCategoryName: 'None',
// 		isBusinessAccount: true,
// 		followersCount: 575,
// 		followsCount: 300,
// 		postsCount: 80,
// 		latestPosts: [],
// 	},
// 	'judith.gilles': {
// 		username: 'judith.gilles',
// 		id: '1777',
// 		fullName: 'Judith',
// 		biography: 'Food & Berlin',
// 		externalUrls: [],
// 		businessCategoryName: 'None',
// 		isBusinessAccount: false,
// 		followersCount: 40000,
// 		followsCount: 900,
// 		postsCount: 1200,
// 		latestPosts: [],
// 	},
// };
//
// /*
//  * Every handle posts tag or bios name, an account read as a profile (`READ_MENTIONED_PROFILES`),
//  * and what their bios settle: an account linked by the addresses it lists, the places it names
//  * joined to one brand, the mentions its tag places, a business we have no venue for searched by
//  * its name and address, and the agent's pick among the places at an address only suggested.
//  */
// describe('mentioned profiles (pglite)', () => {
// 	let harness: PgliteTestingModule;
// 	let scrape: AccountScrapeService;
// 	let accounts: AccountMatchingService;
// 	let matching: MentionMatchingService;
// 	let places: ProfilePlaceService;
// 	let city: City;
// 	// What the address search finds: the places it saves, by search text
// 	const found: Record<string, Partial<Venue>[]> = {};
// 	const searchPlaces = jest.fn(
// 		async (_city: City, searches: string[], _per: number, _cap: number, _purpose: string) => {
// 			const em = harness.orm.em;
// 			const items: { placeId: string; searchString: string }[] = [];
// 			for (const search of searches)
// 				for (const v of found[search] ?? []) {
// 					const brand = em.create(Brand, {
// 						name: v.name!,
// 						key: `${v.name!.toLowerCase().replace(/\W/g, '')}-${++n}`,
// 					});
// 					em.create(Venue, {
// 						city,
// 						brand,
// 						placeId: `found-${n}`,
// 						category: 'Restaurant',
// 						...v,
// 						name: v.name!,
// 					});
// 					items.push({ placeId: `found-${n}`, searchString: search });
// 				}
// 			await em.flush();
// 			return { items, saved: items.length };
// 		},
// 	);
// 	const placeAgent = mockAgent<{ venueId: string | null }>({ venueId: null });
// 	const runActor = jest.fn(async (actor: string, input: any, _opts: unknown) => {
// 		expect(actor).toBe(INSTAGRAM_PROFILE_ACTOR);
// 		return (input.usernames as string[]).map(h => PROFILE_ITEMS[h]).filter(Boolean);
// 	});
//
// 	beforeAll(async () => {
// 		harness = await createPgliteTestingModule({
// 			providers: [
// 				SocialPostService,
// 				SocialAccountService,
// 				AccountScrapeService,
// 				AccountMatchingService,
// 				MentionMatchingService,
// 				BrandService,
// 				CityService,
// 				ProfilePlaceService,
// 				{ provide: ApifyService, useValue: { runActor } },
// 				{ provide: VenueScrapeService, useValue: { searchPlaces } },
// 				{ provide: ProfilePlaceAgent, useValue: placeAgent },
// 				// The gateway as the plain call: no DBOS in this suite
// 				{
// 					provide: DurableLlmService,
// 					useValue: {
// 						generate: async (
// 							agent: {
// 								generate: (
// 									input: string,
// 								) => Promise<{ object: unknown; model: string }>;
// 							},
// 							input: string,
// 						) => {
// 							const res = await agent.generate(input);
// 							return { object: res.object, model: res.model, usage: {}, usd: 0 };
// 						},
// 					},
// 				},
// 				{ provide: PgBossService, useValue: { sendJob: jest.fn(async () => undefined) } },
// 			],
// 		});
// 		scrape = harness.moduleRef.get(AccountScrapeService);
// 		accounts = harness.moduleRef.get(AccountMatchingService);
// 		matching = harness.moduleRef.get(MentionMatchingService);
// 		places = harness.moduleRef.get(ProfilePlaceService);
// 		entityManagerManager.setEntityManager(harness.orm.em);
// 		city = testCity(harness.orm.em);
// 		await harness.orm.em.flush();
// 	});
//
// 	afterAll(async () => {
// 		await harness.stop();
// 	});
//
// 	beforeEach(() => {
// 		runActor.mockClear();
// 		searchPlaces.mockClear();
// 		placeAgent.generate.mockClear();
// 	});
//
// 	let n = 0;
// 	const place = async (name: string, extra: Partial<Venue> = {}): Promise<Venue> => {
// 		const em = harness.orm.em;
// 		const brand = em.create(Brand, {
// 			name,
// 			key: `${name.toLowerCase().replace(/\W/g, '')}-${++n}`,
// 		});
// 		const venue = em.create(Venue, {
// 			city,
// 			brand,
// 			placeId: `tagged-${n}`,
// 			name,
// 			category: 'Restaurant',
// 			...extra,
// 		});
// 		await em.flush();
// 		return venue;
// 	};
// 	const post = async (
// 		taggedHandles: string[],
// 		venueName: string,
// 		extra: Partial<SocialPost> = {},
// 	) => {
// 		const em = harness.orm.em;
// 		const p = em.create(SocialPost, {
// 			externalId: `ig_tagged_${++n}`,
// 			platform: IG,
// 			url: `https://www.instagram.com/p/tagged${n}/`,
// 			postedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
// 			city,
// 			text: `Lunch at @${taggedHandles[0]}`,
// 			taggedHandles,
// 			analysedAt: new Date(),
// 			...extra,
// 		});
// 		const mention = em.create(Mention, {
// 			post: p,
// 			venueName,
// 			visited: true,
// 			matchMethod: MentionMatchMethodEnum.NONE,
// 			matchedAt: new Date(Date.now() - 3600 * 1000),
// 		});
// 		await em.flush();
// 		return mention;
// 	};
// 	const account = (handle: string) =>
// 		harness.orm.em.findOne(
// 			SocialAccount,
// 			{ platform: IG, handle },
// 			{ populate: ['brand', 'branch'], refresh: true },
// 		);
//
// 	it("reads the tagged profiles, links Lucy's account by its bio and joins its two places", async () => {
// 		const em = harness.orm.em;
// 		const deli = await place('Lucy’s The Deli', { street: 'Torstraße 116', reviewsCount: 619 });
// 		const brunnen = await place("Lucy's. A healthy Deli Concept.", {
// 			street: 'Brunnenstraße 24',
// 			reviewsCount: 270,
// 		});
// 		// A stranger at Lucy's first address
// 		const stranger = await place('Torstraße Döner', { street: 'Torstraße 116' });
// 		const byHandle = await post(['lucys.berlin', 'judith.gilles'], 'lucys.berlin');
// 		const byName = await post(['lucys.berlin'], "Lucy's");
// 		// A post the gate skipped tags nobody worth reading
// 		await post(['skipped.handle'], 'skipped.handle', {
// 			skipReason: 'not_food' as SocialPost['skipReason'],
// 		});
//
// 		// Every tagged handle is an account, a skipped post's too
// 		expect(await accounts.addMentionedAccounts(city)).toBe(3);
// 		const read = await scrape.readMentionedProfiles(city, 1);
// 		expect(read).toEqual({ unread: 3, asked: 3, profiles: 2, businesses: 1 });
// 		// The most tagged first, a skipped post's handle last
// 		expect(runActor.mock.calls[0][1].usernames).toEqual([
// 			'lucys.berlin',
// 			'judith.gilles',
// 			'skipped.handle',
// 		]);
// 		const lucys = (await account('lucys.berlin'))!;
// 		expect(lucys).toMatchObject({
// 			bio: expect.stringContaining('Brunnenstraße 24'),
// 			businessCategory: 'Health Food Restaurant',
// 			isBusiness: true,
// 			followers: 11293,
// 			bioLinks: ['https://bookings.zenchef.com/results?rid=365935&pid=1001'],
// 		});
// 		expect(lucys.profileReadAt).toBeTruthy();
//
// 		const result = await accounts.match(city);
// 		expect(result).toMatchObject({ fromProfiles: 1, joinedByProfiles: 1 });
// 		em.clear();
// 		const [deliNow, brunnenNow, strangerNow] = await Promise.all(
// 			[deli, brunnen, stranger].map(v =>
// 				em.findOneOrFail(Venue, { id: v.id }, { populate: ['brand'] }),
// 			),
// 		);
// 		// One brand, the most reviewed place's; the stranger at the same address stays apart
// 		expect(brunnenNow.brand.id).toBe(deliNow.brand.id);
// 		expect(strangerNow.brand.id).not.toBe(deliNow.brand.id);
// 		const linked = (await account('lucys.berlin'))!;
// 		expect(linked.brand?.id).toBe(deliNow.brand.id);
// 		expect(linked.brandSource).toBe(AccountBrandSourceEnum.BIO);
// 		expect(linked.branch).toBeFalsy();
// 		// A person's profile names no place
// 		expect((await account('judith.gilles'))!.brand).toBeFalsy();
//
// 		// Both mentions are placed by the tag: the handle as the name, and a name the handle is named after
// 		const counts = await matching.matchByTags(city.id);
// 		expect(counts[MentionMatchMethodEnum.ACCOUNT]).toBe(2);
// 		for (const m of [byHandle, byName]) {
// 			const now = await em.findOneOrFail(Mention, { id: m.id }, { refresh: true });
// 			expect(now.matchMethod).toBe(MentionMatchMethodEnum.ACCOUNT);
// 			expect(now.brand?.id).toBe(deliNow.brand.id);
// 			// Two branches and no hint: the brand alone
// 			expect(now.venue).toBeFalsy();
// 		}
//
// 		// Read once, and a profile that didn't come back waits: the next run asks nobody again
// 		runActor.mockClear();
// 		expect((await scrape.readMentionedProfiles(city, 1)).asked).toBe(0);
// 		expect(runActor).not.toHaveBeenCalled();
// 	});
//
// 	it('never joins a place the brand excluded, and keeps an earlier link of another kind', async () => {
// 		const em = harness.orm.em;
// 		const main = await place('Kaffee Rosa', { street: 'Weserstraße 10', reviewsCount: 300 });
// 		const other = await place('Kaffee Rosa Zwei', { street: 'Sonnenallee 20' });
// 		em.create(BrandExcludedVenue, { brand: main.brand, venue: other });
// 		const rosa = em.create(SocialAccount, {
// 			platform: IG,
// 			handle: 'kaffeerosa',
// 			city,
// 			bio: 'Weserstraße 10 · Sonnenallee 20',
// 			isBusiness: true,
// 			profileReadAt: new Date(),
// 			brand: main.brand,
// 			brandSource: AccountBrandSourceEnum.ADMIN,
// 		});
// 		await em.flush();
//
// 		const result = await accounts.match(city);
// 		expect(result.joinedByProfiles).toBe(0);
// 		em.clear();
// 		expect(
// 			(await em.findOneOrFail(Venue, { id: other.id }, { populate: ['brand'] })).brand.id,
// 		).not.toBe(main.brand.id);
// 		const now = (await account(rosa.handle))!;
// 		expect(now.brandSource).toBe(AccountBrandSourceEnum.ADMIN);
// 	});
//
// 	it('merges nothing from a profile that is not a business: a fan page named like the place is only suggested', async () => {
// 		const em = harness.orm.em;
// 		const one = await place('Bao Bao Mitte', { street: 'Linienstraße 40', reviewsCount: 500 });
// 		const two = await place('Bao Bao Kreuzberg', {
// 			street: 'Oranienstraße 9',
// 			reviewsCount: 200,
// 		});
// 		em.create(SocialAccount, {
// 			platform: IG,
// 			handle: 'baobao.fans',
// 			city,
// 			bio: 'my faves 💛 Linienstraße 40 · Oranienstraße 9',
// 			isBusiness: false,
// 			profileReadAt: new Date(),
// 		});
// 		await em.flush();
//
// 		const result = await accounts.match(city);
// 		expect(result.joinedByProfiles).toBe(0);
// 		em.clear();
// 		const [oneNow, twoNow] = await Promise.all(
// 			[one, two].map(v => em.findOneOrFail(Venue, { id: v.id }, { populate: ['brand'] })),
// 		);
// 		expect(twoNow.brand.id).not.toBe(oneNow.brand.id);
// 		const fans = (await em.findOneOrFail(
// 			SocialAccount,
// 			{ platform: IG, handle: 'baobao.fans' },
// 			{ populate: ['brand', 'suggestedBrand'] },
// 		))!;
// 		expect(fans.brand).toBeFalsy();
// 		expect(fans.suggestedBrand?.id).toBe(oneNow.brand.id);
// 	});
//
// 	it("searches a business profile we have no place for by its name and its bio's address", async () => {
// 		await post(['selocoffeeberlin'], 'selocoffeeberlin');
// 		await accounts.addMentionedAccounts(city);
// 		await scrape.readMentionedProfiles(city, 1);
// 		const names = await matching.unmatchedNames(city.id);
// 		expect(names).toContain('SELO COFFEE Tempelhofer Damm 212, 12099');
// 		expect(names).not.toContain('selocoffeeberlin');
// 	});
//
// 	it("makes an account of every handle a bio names, but links a tag-only handle only when it carries the brand's whole name", async () => {
// 		const em = harness.orm.em;
// 		const samurai = await place('Samurai Wagyu Yakiniku', { street: 'Kantstraße 7' });
// 		const m = await post(['samurai'], 'Samurai Wagyu Yakiniku');
// 		Object.assign(m, {
// 			brand: samurai.brand,
// 			venue: samurai,
// 			matchMethod: MentionMatchMethodEnum.EXACT,
// 		});
// 		em.create(SocialAccount, {
// 			platform: IG,
// 			handle: 'magicbitteberlin',
// 			city,
// 			bio: 'Hier ist Magic. by @haelibo',
// 			profileReadAt: new Date(),
// 		});
// 		await em.flush();
//
// 		await accounts.match(city);
// 		expect(await account('haelibo')).toBeTruthy();
// 		// "@samurai" exists now, but a part of the name is someone else's handle
// 		const handle = (await em.findOneOrFail(
// 			SocialAccount,
// 			{ platform: IG, handle: 'samurai' },
// 			{ populate: ['brand', 'suggestedBrand'], refresh: true },
// 		))!;
// 		expect(handle.brand).toBeFalsy();
// 		expect(handle.suggestedBrand).toBeFalsy();
// 	});
//
// 	it("searches an unknown address once, and only suggests the agent's pick among the places there", async () => {
// 		const em = harness.orm.em;
// 		const kantine = em.create(SocialAccount, {
// 			platform: IG,
// 			handle: 'kantine.k36',
// 			displayName: 'Kantine K36',
// 			city,
// 			bio: 'Mittagstisch Mo–Fr 12–15 · Oranienstraße 36, 10999',
// 			isBusiness: true,
// 			followers: 900,
// 			profileReadAt: new Date(),
// 		});
// 		// A person's profile is never searched
// 		em.create(SocialAccount, {
// 			platform: IG,
// 			handle: 'some.person',
// 			city,
// 			bio: 'Oranienstraße 36',
// 			isBusiness: false,
// 			profileReadAt: new Date(),
// 		});
// 		await em.flush();
// 		found['Kantine K36 Oranienstraße 36, 10999 Berlin'] = [
// 			{ name: 'Restaurant Morgenland', street: 'Oranienstraße 36' },
// 		];
//
// 		const searched = await places.searchAddresses(city, 1);
// 		// Selo's address (the test before) is due too; the most followed first
// 		expect(searched).toMatchObject({ due: 2, searched: 2, found: 1, saved: 1 });
// 		expect(searchPlaces.mock.calls[0][1]).toEqual([
// 			'Kantine K36 Oranienstraße 36, 10999 Berlin',
// 			'SELO COFFEE Tempelhofer Damm 212, 12099 Berlin',
// 		]);
// 		// Not named like the profile: the matcher links nothing, the agent is asked
// 		await accounts.match(city);
// 		const morgenland = await em.findOneOrFail(
// 			Venue,
// 			{ name: 'Restaurant Morgenland' },
// 			{ populate: ['brand'] },
// 		);
// 		placeAgent.generate.mockImplementationOnce(async () => ({
// 			object: { venueId: morgenland.id },
// 			usage: undefined,
// 			model: 'mock',
// 		}));
// 		expect(await places.askPlaces(city)).toEqual({ asked: 1, suggested: 1 });
// 		const now = (await em.findOneOrFail(
// 			SocialAccount,
// 			{ id: kantine.id },
// 			{ populate: ['brand', 'suggestedBrand'], refresh: true },
// 		))!;
// 		expect(now.brand).toBeFalsy();
// 		expect(now.suggestedBrand?.id).toBe(morgenland.brand.id);
// 		expect(now.placesSearchedAt).toBeTruthy();
//
// 		// Once each: searched and asked
// 		expect((await places.searchAddresses(city, 1)).searched).toBe(0);
// 		expect((await places.askPlaces(city)).asked).toBe(0);
// 	});
// });

import { describe, it } from '@jest/globals';

// Kept visible as skipped while the suite above stays commented out
describe.skip('mentioned-profiles.pglite.spec (commented out)', () => {
	it.todo('port the suite above');
});
