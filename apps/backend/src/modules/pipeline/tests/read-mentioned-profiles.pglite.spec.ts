// import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
//
// import { ApifyService } from 'src/modules/apify/services/apify.service.js';
// import type { City } from 'src/modules/cities/entities/city.entity.js';
// import { CityService } from 'src/modules/cities/services/city.service.js';
// import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
// import { DurableLlmService } from 'src/modules/durable-workflows/services/durable-llm.service.js';
// import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
// import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
// import { ProfilePlaceAgent } from 'src/modules/social/agents/profile-place.agent.js';
// import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
// import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
// import { AccountMatchingService } from 'src/modules/social/services/account-matching.service.js';
// import {
// 	AccountScrapeService,
// 	INSTAGRAM_PROFILE_ACTOR,
// } from 'src/modules/social/services/account-scrape.service.js';
// import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
// import { ProfilePlaceService } from 'src/modules/social/services/profile-place.service.js';
// import { SocialAccountService } from 'src/modules/social/services/social-account.service.js';
// import { SocialPostService } from 'src/modules/social/services/social-post.service.js';
// import { Brand } from 'src/modules/venues/entities/brand.entity.js';
// import { Venue } from 'src/modules/venues/entities/venue.entity.js';
// import { BrandService } from 'src/modules/venues/services/brand.service.js';
// import {
// 	GOOGLE_PLACES_ACTOR,
// 	VenueScrapeService,
// } from 'src/modules/venues/services/venue-scrape.service.js';
// import { entityManagerManager } from 'src/shared/util/em.js';
// import { mockAgent } from 'src/tests/mock-agent.js';
// import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';
//
// import { READ_MENTIONED_PROFILES_QUEUE } from '../queues/read-mentioned-profiles.queue.js';
// import { ReadMentionedProfilesSchedule } from '../schedules/read-mentioned-profiles.schedule.js';
//
// const IG = SocialPlatformEnum.INSTAGRAM;
//
// // `apify/instagram-profile-scraper`'s item for a business whose bio gives an address we have no place at
// const SELO = {
// 	username: 'selocoffeeberlin',
// 	id: '61234567890',
// 	fullName: 'SELO COFFEE',
// 	biography:
// 		'coffee•aperitif•community\nfamily-run coffee shop | card only\nTempelhofer Damm 212, 12099 Berlin 📍',
// 	externalUrls: [],
// 	businessCategoryName: 'Coffee Shop',
// 	isBusinessAccount: true,
// 	followersCount: 575,
// 	followsCount: 300,
// 	postsCount: 80,
// 	latestPosts: [],
// };
//
// /*
//  * The weekly mentioned-profile run as a workflow: the schedule starts one run per cron city, and
//  * the run reads the tagged profiles (an actor run),
//  * searches a business profile's bio address (an actor run), asks the agent one LLM call per
//  * profile and records the suggestion, each part a step. The facade here runs steps plainly and
//  * starts a workflow inline, so the body's sequence is what is tested.
//  */
// describe('Read mentioned profiles (pglite)', () => {
// 	let harness: PgliteTestingModule;
// 	let schedule: ReadMentionedProfilesSchedule;
// 	let city: City;
// 	const started: { args: unknown[]; options: Record<string, unknown> }[] = [];
// 	const durable = {
// 		isLaunched: () => true,
// 		inWorkflow: () => false,
// 		isInStep: () => false,
// 		step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
// 		start: async (
// 			fn: (...a: unknown[]) => Promise<unknown>,
// 			args: unknown[],
// 			options: Record<string, unknown>,
// 		) => {
// 			started.push({ args, options });
// 			return { workflowID: `wf-${started.length}`, getResult: () => fn(...args) };
// 		},
// 	};
// 	const placeAgent = mockAgent<{ venueId: string | null }>({ venueId: null });
// 	// The LLM gateway as the plain call behind a handle
// 	type FakeAgent = { generate: (input: string) => Promise<{ object: unknown; model: string }> };
// 	const durableLlm = {
// 		start: jest.fn(
// 			async (agent: FakeAgent, input: string, _context?: unknown, _options?: unknown) => ({
// 				workflowID: 'llm-1',
// 				getResult: async () => {
// 					const res = await agent.generate(input);
// 					return { object: res.object, model: res.model, usage: {}, usd: 0 };
// 				},
// 			}),
// 		),
// 	};
// 	// What the address search finds at an address (matched by the street in the search), created as venues by the fake actor run
// 	const found: Record<string, Partial<Venue>[]> = {};
// 	let n = 0;
// 	const runActor = jest.fn(
// 		async (
// 			actor: string,
// 			input: Record<string, unknown>,
// 			_opts: { maxCostUsd: number; purpose: string },
// 		): Promise<unknown[]> => {
// 			if (actor === INSTAGRAM_PROFILE_ACTOR)
// 				return (input.usernames as string[])
// 					.map(h => (h === SELO.username ? SELO : null))
// 					.filter(Boolean);
// 			if (actor === GOOGLE_PLACES_ACTOR) {
// 				const em = harness.orm.em.fork();
// 				const items: { placeId: string; searchString: string }[] = [];
// 				for (const search of input.searchStringsArray as string[])
// 					for (const v of Object.entries(found).find(([street]) =>
// 						search.includes(street),
// 					)?.[1] ?? []) {
// 						const brand = em.create(Brand, {
// 							name: v.name!,
// 							key: `${v.name!.toLowerCase().replace(/\W/g, '')}-${++n}`,
// 						});
// 						em.create(Venue, {
// 							city,
// 							brand,
// 							placeId: `found-${n}`,
// 							category: 'Cafe',
// 							...v,
// 							name: v.name!,
// 						});
// 						items.push({ placeId: `found-${n}`, searchString: search });
// 					}
// 				await em.flush();
// 				return items;
// 			}
// 			throw new Error(`Unexpected actor ${actor}`);
// 		},
// 	);
// 	beforeAll(async () => {
// 		harness = await createPgliteTestingModule({
// 			providers: [
// 				ReadMentionedProfilesSchedule,
// 				SocialPostService,
// 				SocialAccountService,
// 				AccountScrapeService,
// 				AccountMatchingService,
// 				MentionMatchingService,
// 				ProfilePlaceService,
// 				BrandService,
// 				CityService,
// 				{ provide: ApifyService, useValue: { runActor } },
// 				// The places a search finds are saved by the fake actor run already
// 				{
// 					provide: VenueScrapeService,
// 					useValue: {
// 						placesSearchInput: (searches: string[], perSearch: number) => ({
// 							searchStringsArray: searches,
// 							maxCrawledPlacesPerSearch: perSearch,
// 						}),
// 						saveFound: async (items: unknown[]) => items.length,
// 					},
// 				},
// 				{ provide: DurableWorkflowsService, useValue: durable },
// 				{ provide: DurableLlmService, useValue: durableLlm },
// 				{ provide: ProfilePlaceAgent, useValue: placeAgent },
// 				{ provide: PgBossService, useValue: { sendJob: jest.fn(async () => undefined) } },
// 			],
// 		});
// 		entityManagerManager.setEntityManager(harness.orm.em);
// 		schedule = harness.moduleRef.get(ReadMentionedProfilesSchedule);
// 		city = cityFactory.build({ name: 'Berlin', cronEnabled: true });
// 		await harness.orm.em.flush();
// 	});
//
// 	afterAll(async () => {
// 		await harness.stop();
// 	});
//
// 	beforeEach(async () => {
// 		jest.clearAllMocks();
// 		started.length = 0;
// 	});
//
// 	const post = async (taggedHandles: string[]) => {
// 		const em = harness.orm.em.fork();
// 		em.create(SocialPost, {
// 			externalId: `ig_tagged_${++n}`,
// 			platform: IG,
// 			url: `https://www.instagram.com/p/tagged${n}/`,
// 			postedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
// 			city,
// 			text: `Coffee at @${taggedHandles[0]}`,
// 			taggedHandles,
// 			analysedAt: new Date(),
// 		});
// 		await em.flush();
// 	};
//
// 	it('reads a tagged business profile, searches its bio address, asks the agent about the places there and suggests its pick', async () => {
// 		await post([SELO.username]);
// 		found['Tempelhofer Damm 212'] = [
// 			{ name: 'Café Tempelhof', street: 'Tempelhofer Damm 212' },
// 			{ name: 'Kiosk 212', street: 'Tempelhofer Damm 212' },
// 		];
// 		placeAgent.generate.mockImplementationOnce(async () => {
// 			const kiosk = await harness.orm.em.fork().findOneOrFail(Venue, { name: 'Kiosk 212' });
// 			return { object: { venueId: kiosk.id }, usage: undefined, model: 'mock' };
// 		});
//
// 		const result = await schedule.readCity(city.id, { month: '2026-11', budgetUsd: 2 });
//
// 		expect(result.created).toBe(1);
// 		expect(result.profiles).toMatchObject({
// 			unread: 1,
// 			asked: 1,
// 			read: 1,
// 			businesses: 1,
// 			snapshots: 1,
// 		});
// 		expect(result.addresses).toMatchObject({ due: 1, searched: 1, found: 2, saved: 2 });
// 		expect(result.places).toEqual({ asked: 1, suggested: 1, unanswered: 0 });
// 		// The actor runs, as the workflow started them: the profiles first, then the address
// 		expect(runActor.mock.calls.map(c => c[0])).toEqual([
// 			INSTAGRAM_PROFILE_ACTOR,
// 			GOOGLE_PLACES_ACTOR,
// 		]);
// 		expect(runActor.mock.calls[0][1]).toEqual({ usernames: [SELO.username] });
// 		const search = runActor.mock.calls[1][1] as {
// 			searchStringsArray: string[];
// 			maxCrawledPlacesPerSearch: number;
// 		};
// 		expect(search.maxCrawledPlacesPerSearch).toBe(3);
// 		expect(search.searchStringsArray).toHaveLength(1);
// 		expect(search.searchStringsArray[0]).toContain('SELO COFFEE');
// 		expect(search.searchStringsArray[0]).toContain('Tempelhofer Damm 212');
// 		expect(search.searchStringsArray[0]).toContain('Berlin');
// 		// One LLM call workflow per profile, waiting for a model
// 		expect(durableLlm.start).toHaveBeenCalledTimes(1);
// 		expect(durableLlm.start.mock.calls[0][3]).toEqual({ mode: 'wait' });
// 		const account = await harness.orm.em
// 			.fork()
// 			.findOneOrFail(
// 				SocialAccount,
// 				{ platform: IG, handle: SELO.username },
// 				{ populate: ['suggestedBrand'] },
// 			);
// 		expect(account.isBusiness).toBe(true);
// 		expect(account.placesSearchedAt).toBeInstanceOf(Date);
// 		expect(account.placeAskedAt).toBeInstanceOf(Date);
// 		expect(account.suggestedBrand?.name).toBe('Kiosk 212');
// 		expect(account.brand).toBeFalsy();
// 	});
//
// 	it('runs nothing when nothing is left to read', async () => {
// 		const result = await schedule.readCity(city.id, { month: '2026-11', budgetUsd: 2 });
//
// 		expect(runActor).not.toHaveBeenCalled();
// 		expect(result.profiles.asked).toBe(0);
// 		expect(result.places).toEqual({ asked: 0, suggested: 0, unanswered: 0 });
// 	});
//
// 	it('starts one run per cron city from the schedule, one waiting per city, under the month it fired in', async () => {
// 		cityFactory.build({ name: 'Off', cronEnabled: false });
// 		await harness.orm.em.flush();
//
// 		await schedule.weekly(new Date('2026-11-08T06:00:00Z'));
//
// 		expect(started).toHaveLength(1);
// 		expect(started[0].args).toEqual([city.id, { month: '2026-11' }]);
// 		expect(started[0].options).toMatchObject({
// 			queue: READ_MENTIONED_PROFILES_QUEUE,
// 			dedupe: city.id,
// 			onDuplicate: 'return-existing',
// 			attributes: { cityId: city.id, purpose: 'read-mentioned-profiles' },
// 		});
// 	});
// });

import { describe, it } from '@jest/globals';

// Kept visible as skipped while the suite above stays commented out
describe.skip('read-mentioned-profiles.pglite.spec (commented out)', () => {
	it.todo('port the suite above');
});
