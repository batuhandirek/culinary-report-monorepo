import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AccountRejectedBrand } from '../entities/account-rejected-brand.entity.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { AccountMatchingService } from '../services/account-matching.service.js';
import {
	INSTAGRAM_PROFILE_ACTOR,
	TIKTOK_PROFILE_ACTOR,
} from '../services/account-scrape.service.js';
import { AccountTwinService } from '../services/account-twin.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';
import type { LinkedProfile } from '../util/accounts.js';

import { TWIN_INSTAGRAM_ITEMS, TWIN_TIKTOK_ITEMS } from './fixtures/twin-profile-items.js';

const IG = SocialPlatformEnum.INSTAGRAM;
const TT = SocialPlatformEnum.TIKTOK;
const ig = (handle: string): LinkedProfile => ({ platform: IG, handle });
const tt = (handle: string): LinkedProfile => ({ platform: TT, handle });

// The real Munchies items, renamed to another handle: an Instagram profile and a TikTok video
const instagramItem = (handle: string, extra: Record<string, unknown> = {}) => ({
	...TWIN_INSTAGRAM_ITEMS[0],
	username: handle,
	url: `https://www.instagram.com/${handle}`,
	...extra,
});
const tiktokItem = (handle: string, author: Record<string, unknown> = {}) => ({
	...TWIN_TIKTOK_ITEMS[1],
	input: handle,
	authorMeta: { ...TWIN_TIKTOK_ITEMS[1].authorMeta, name: handle, nickName: handle, ...author },
});
const notFound = (platform: SocialPlatformEnum, handle: string) =>
	platform === IG ?
		{ ...TWIN_INSTAGRAM_ITEMS[1], username: handle, url: `https://www.instagram.com/${handle}` }
	:	{ ...TWIN_TIKTOK_ITEMS[0], input: handle, url: `https://www.tiktok.com/@${handle}` };

/*
 * A brand's own accounts found three ways: the profiles its website links and the handles posts
 * about it tag (`AccountMatchingService`, free), and its handle on the other platform verified on
 * the profile (`AccountTwinService`, the profile actors mocked on real items).
 */
describe('finding brands’ own accounts (pglite)', () => {
	let harness: PgliteTestingModule;
	let matching: AccountMatchingService;
	let twins: AccountTwinService;
	let city: City;
	// What the profile actors answer, by platform and handle; absent: not returned at all
	let profiles: Record<string, unknown>;
	const runActor = jest.fn(async (actor: string, input: any, _opts: unknown) => {
		const platform = actor === INSTAGRAM_PROFILE_ACTOR ? IG : TT;
		const handles: string[] = platform === IG ? input.usernames : input.profiles;
		return handles.map(h => profiles[`${platform}:${h}`]).filter(Boolean);
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialPostService,
				SocialAccountService,
				AccountMatchingService,
				AccountTwinService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		matching = harness.moduleRef.get(AccountMatchingService);
		twins = harness.moduleRef.get(AccountTwinService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = testCity(harness.orm.em);
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		profiles = {};
		runActor.mockClear();
	});

	let n = 0;
	const place = async (
		name: string,
		extra: Partial<Venue> = {},
		leadScore?: number,
	): Promise<Venue> => {
		const em = harness.orm.em;
		const brand = em.create(Brand, {
			name,
			key: name.toLowerCase().replace(/\W/g, ''),
			leadScore,
		});
		const venue = em.create(Venue, {
			city,
			brand,
			placeId: `own-${++n}`,
			name,
			category: 'Restaurant',
			...extra,
		});
		await em.flush();
		return venue;
	};
	const account = (platform: SocialPlatformEnum, handle: string) =>
		harness.orm.em.findOne(
			SocialAccount,
			{ platform, handle },
			{ populate: ['brand', 'suggestedBrand'], refresh: true },
		);
	const linked = async (
		venue: Venue,
		platform: SocialPlatformEnum,
		handle: string,
		source = AccountBrandSourceEnum.HANDLE,
	) => {
		const em = harness.orm.em;
		const row = await harness.moduleRef
			.get(SocialAccountService)
			.ensure(platform, handle, city);
		await harness.moduleRef
			.get(SocialAccountService)
			.setBrand(row!, venue.brand as Brand, source);
		await em.flush();
		return row!;
	};

	describe('from the brand’s website', () => {
		it('links the profiles named after the brand, before they ever posted for us', async () => {
			const munchies = await place('Munchies', {
				website: 'https://www.eatmunchies.de/',
				siteProfiles: [ig('munchiesde'), tt('munchiesde')],
			});
			const result = await matching.match(city);
			expect(result.fromSites).toBe(2);
			for (const platform of [IG, TT])
				expect(await account(platform, 'munchiesde')).toMatchObject({
					brand: { id: munchies.brand.id },
					brandSource: AccountBrandSourceEnum.SITE,
					city: { id: city.id },
				});
			// Once linked, a run changes nothing
			expect((await matching.match(city)).fromSites).toBe(0);
		});

		it('suggests a site’s only profile that isn’t named after the brand', async () => {
			const hirsch = await place('Zum Goldenen Hirsch', {
				website: 'https://goldener-hirsch.de/',
				siteProfiles: [ig('hirsch_wirtshaus')],
			});
			expect((await matching.match(city)).siteSuggested).toBe(1);
			expect(await account(IG, 'hirsch_wirtshaus')).toMatchObject({
				brand: null,
				suggestedBrand: { id: hirsch.brand.id },
			});
		});

		it('ignores a profile three brands’ sites link: an agency’s credit, or a group’s account', async () => {
			for (const name of ['Trattoria Alba', 'Kaffeehaus Nord', 'Bistro Kiez'])
				await place(name, {
					website: `https://${name.toLowerCase().replace(/\W/g, '')}.de/`,
					siteProfiles: [ig('pixelwerk.agentur')],
				});
			// A group's venues, each a brand, on pages of the group's one site
			for (const name of ['Amano Bar', 'Amano Grand Central', 'Amano Rooftop'])
				await place(name, {
					website: `https://amanogroup.de/${name.toLowerCase().replace(/\W/g, '-')}`,
					siteProfiles: [ig('amanogroup')],
				});
			await matching.match(city);
			expect(await account(IG, 'pixelwerk.agentur')).toBeNull();
			expect(await account(IG, 'amanogroup')).toBeNull();
		});

		it('never overrides an admin’s link, nor links a brand an admin rejected', async () => {
			const em = harness.orm.em;
			const owner = await place('Kaffeebar Ost');
			const kaffee = await linked(owner, IG, 'kaffeebar.ost', AccountBrandSourceEnum.ADMIN);
			const other = await place('Röstwerk Zwei', {
				website: 'https://roestwerk.de/',
				siteProfiles: [ig('kaffeebar.ost'), tt('roestwerkzwei')],
			});
			const tiktok = await harness.moduleRef
				.get(SocialAccountService)
				.ensure(TT, 'roestwerkzwei', city);
			await em.flush();
			em.create(AccountRejectedBrand, { account: tiktok!, brand: other.brand });
			await em.flush();
			await matching.match(city);
			expect(await account(IG, kaffee.handle)).toMatchObject({
				brand: { id: owner.brand.id },
				brandSource: AccountBrandSourceEnum.ADMIN,
			});
			expect(await account(TT, 'roestwerkzwei')).toMatchObject({
				brand: null,
				suggestedBrand: null,
			});
		});
	});

	describe('from creators’ tags', () => {
		let tagged = 0;
		const post = async (
			platform: SocialPlatformEnum,
			venue: Venue,
			taggedHandles: string[],
		) => {
			const em = harness.orm.em;
			const externalId = `tagged-${++tagged}`;
			await harness.moduleRef.get(SocialPostService).upsert(
				{
					externalId,
					platform,
					url: `https://example.com/${externalId}`,
					postedAt: new Date('2026-09-12T12:00:00Z'),
					author: 'foodie.lisa',
					views: 100,
					taggedHandles,
				},
				city,
			);
			await em.flush();
			em.create(Mention, {
				post: await em.findOneOrFail(SocialPost, { externalId }),
				venueName: venue.name,
				venue,
				brand: venue.brand,
				matchMethod: MentionMatchMethodEnum.EXACT,
				visited: true,
				sentiment: 'positive',
				summary: 'Nice.',
			});
			await em.flush();
		};

		it('makes an account of an Instagram tag holding the name of the brand the post was about, and links it', async () => {
			const kanaan = await place('Kanaan');
			const samurai = await place('Samurai Wagyu Yakiniku');
			await post(IG, kanaan, ['eat.kanaan', 'lisas.friend']);
			// Part of a name is someone else's handle; a caption's @ cuts "@Frieda-Schlamassel.de" short the same way
			await post(IG, samurai, ['samurai']);
			// TikTok's tags are display names as the caption shows them, never handles
			await post(TT, kanaan, ['@Kanaan Berlin', '@kanaan.official']);

			const result = await matching.match(city);
			expect(result.fromTags).toBe(1);
			// Holding "kanaan" links only with the tag under a post about Kanaan as evidence
			expect(await account(IG, 'eat.kanaan')).toMatchObject({
				brand: { id: kanaan.brand.id },
				brandSource: AccountBrandSourceEnum.HANDLE,
			});
			for (const [platform, handle] of [
				[IG, 'lisas.friend'],
				[IG, 'samurai'],
				[TT, 'kanaan.official'],
			] as const)
				expect(await account(platform, handle)).toBeNull();
		});
	});

	describe('on the other platform', () => {
		it('links a profile that proves itself, suggests one only named like the brand, and looks each up once', async () => {
			// Instagram account known, TikTok missing: the TikTok bio names the branch's street
			const doener = await place(
				'Döner Pro',
				{ website: 'https://doenerpro.com/', street: 'Kantstraße 107' },
				90,
			);
			await linked(doener, IG, 'doenerpro');
			profiles['tiktok:doenerpro'] = tiktokItem('doenerpro');
			// TikTok account known, Instagram missing: the profile's link is another site, its name the brand's
			const pasta = await place(
				'Pasta Lab',
				{ website: 'https://pastalab.de/', street: 'Oranienstraße 1' },
				80,
			);
			await linked(pasta, TT, 'pastalab');
			profiles['instagram:pastalab'] = instagramItem('pastalab', {
				fullName: 'Pasta Lab',
				biography: 'Fresh pasta',
			});
			// Not on TikTok at all
			const ghost = await place('Ghost Kitchen', { website: 'https://ghost.de/' }, 70);
			await linked(ghost, IG, 'ghostkitchen');
			profiles['tiktok:ghostkitchen'] = notFound(TT, 'ghostkitchen');
			// The run never returned it: looked up again next time
			const late = await place('Late Bite', { website: 'https://latebite.de/' }, 60);
			await linked(late, IG, 'latebite');

			const result = await twins.lookup(city, 1);
			expect(result).toMatchObject({
				found: 2,
				linked: 1,
				suggested: 1,
				proofs: { street: 1 },
			});
			expect(runActor).toHaveBeenCalledWith(
				TIKTOK_PROFILE_ACTOR,
				expect.objectContaining({
					profiles: expect.arrayContaining(['doenerpro', 'ghostkitchen', 'latebite']),
					resultsPerPage: 1,
				}),
				expect.anything(),
			);
			expect(await account(TT, 'doenerpro')).toMatchObject({
				brand: { id: doener.brand.id },
				brandSource: AccountBrandSourceEnum.PROFILE,
				followers: 18500,
			});
			expect(await account(IG, 'pastalab')).toMatchObject({
				brand: null,
				suggestedBrand: { id: pasta.brand.id },
			});
			expect(await account(TT, 'ghostkitchen')).toBeNull();
			expect((await account(IG, 'ghostkitchen'))!.twinCheckedAt).toBeInstanceOf(Date);
			expect((await account(IG, 'latebite'))!.twinCheckedAt).toBeFalsy();

			// The next run asks again for what wasn't answered, never for what was
			runActor.mockClear();
			await twins.lookup(city, 1);
			const asked = runActor.mock.calls.flatMap(
				([, input]) => (input as any).usernames ?? (input as any).profiles,
			);
			expect(asked).toContain('latebite');
			for (const handle of ['doenerpro', 'pastalab', 'ghostkitchen'])
				expect(asked).not.toContain(handle);
		});

		it('links on the brand’s site in the profile, and spends the budget on the highest scores first', async () => {
			const munchies = await place(
				'Munchies Kreuzberg',
				{ website: 'https://www.eatmunchies.de/' },
				99,
			);
			await linked(munchies, TT, 'munchies.xberg');
			profiles['instagram:munchies.xberg'] = instagramItem('munchies.xberg');
			const low = await place('Low Score Grill', { website: 'https://lowscore.de/' }, 1);
			await linked(low, TT, 'lowscoregrill');

			// One Instagram lookup's worth
			const result = await twins.lookup(city, 0.003);
			expect(result.lookedUp).toBe(1);
			expect(result.proofs).toEqual({ site: 1 });
			expect(await account(IG, 'munchies.xberg')).toMatchObject({
				brand: { id: munchies.brand.id },
				brandSource: AccountBrandSourceEnum.PROFILE,
			});
			expect((await account(TT, 'lowscoregrill'))!.twinCheckedAt).toBeFalsy();
		});
	});
});
