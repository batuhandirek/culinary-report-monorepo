import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminSocialController } from '../controllers/admin.social.controller.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionMatchingService, settleMatch } from '../services/mention-matching.service.js';

import { matchWithAgent } from './factories/match-with-agent.js';

describe('MentionMatchingService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MentionMatchingService;
	let berlin: City;
	let munich: City;
	// `VenueMatchAgent`'s stand-in: every close call is put to it
	const generate = jest.fn(async (_message: string) => ({
		object: { venueId: null as string | null, branchId: null as string | null },
	}));
	const match = (opts: { cityId?: string; rematch?: boolean } = {}) =>
		matchWithAgent(service, generate, opts);

	const mention = (post: SocialPost, venueName: string, city: string | null = null) =>
		harness.orm.em.create(Mention, {
			post,
			venueName,
			city,
			visited: true,
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [MentionMatchingService, CityService, AdminSocialController],
		});
		service = harness.moduleRef.get(MentionMatchingService);
		entityManagerManager.setEntityManager(harness.orm.em);
		berlin = await cityFactory.create({ name: 'Berlin', nameStopwords: ['berlin'] });
		munich = await cityFactory.create({
			name: 'München',
			aliases: ['Munich'],
			nameStopwords: ['munchen', 'munich'],
		});
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('links an exact name, leaves another city out, and asks the LLM only for close calls', async () => {
		const em = harness.orm.em;
		em.create(Venue, {
			city: berlin.id,
			placeId: 'p-hisar',
			name: 'Hisar fresh food',
			category: 'Kebab shop',
		});
		em.create(Venue, {
			city: berlin.id,
			placeId: 'p-nhas',
			name: 'Nhas City Chicken',
			category: 'Chicken restaurant',
		});
		const post = em.create(SocialPost, {
			city: berlin.id,
			externalId: 'v1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/v1',
			postedAt: new Date('2026-09-10T00:00:00Z'),
		});
		mention(post, 'Hisar Fresh Food');
		mention(post, 'Nhas City Chicken', 'Köln');
		mention(post, 'City Chicken');
		mention(post, 'Noma');
		await em.flush();

		const counts = await match();
		expect(counts).toMatchObject({
			[MentionMatchMethodEnum.EXACT]: 1,
			[MentionMatchMethodEnum.OTHER_CITY]: 1,
			[MentionMatchMethodEnum.NONE]: 2,
		});
		// "City Chicken" had a candidate (the LLM said no); "Noma" had none to ask about
		expect(generate).toHaveBeenCalledTimes(1);

		em.clear();
		const hisar = await em.findOneOrFail(
			Mention,
			{ venueName: 'Hisar Fresh Food' },
			{ populate: ['venue'] },
		);
		expect(hisar.venue?.name).toBe('Hisar fresh food');
	});

	it('only retries unmatched mentions once new venues arrive', async () => {
		generate.mockClear();
		expect(Object.values(await match()).reduce((a, b) => a + b, 0)).toBe(0);
		expect(generate).not.toHaveBeenCalled();

		harness.orm.em.create(Venue, {
			city: berlin.id,
			placeId: 'p-noma',
			name: 'Noma',
			category: 'Restaurant',
		});
		await harness.orm.em.flush();
		const counts = await match();
		expect(counts[MentionMatchMethodEnum.EXACT]).toBe(1);
	});

	it('sets venue and method through the PATCH, and never rematches a corrected mention', async () => {
		const em = harness.orm.em;
		const controller = harness.moduleRef.get(AdminSocialController);
		const hisar = await em.findOneOrFail(Venue, { placeId: 'p-hisar' });
		const nhas = await em.findOneOrFail(Venue, { placeId: 'p-nhas' });
		const post = em.create(SocialPost, {
			city: berlin.id,
			externalId: 'v2',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/v2',
			postedAt: new Date('2026-09-11T00:00:00Z'),
		});
		// Matching would link both to Hisar
		const relinked = mention(post, 'Hisar Fresh Food');
		const ignored = mention(post, 'Hisar Fresh Food');
		const unlinked = mention(post, 'Hisar Fresh Food');
		await em.flush();
		await match();

		const out = await controller.updateMention(relinked.id, {
			venueId: nhas.id,
			note: 'Wrong Hisar',
		});
		expect(out).toMatchObject({
			venue: { id: nhas.id },
			matchMethod: MentionMatchMethodEnum.MANUAL,
			matchNote: 'Wrong Hisar',
		});
		// `ignored` wins over a venue
		await controller.updateMention(ignored.id, { venueId: hisar.id, ignored: true });
		await controller.updateMention(unlinked.id, { venueId: null });

		const counts = await match({ rematch: true });
		expect(counts[MentionMatchMethodEnum.MANUAL]).toBe(0);
		expect(counts[MentionMatchMethodEnum.IGNORED]).toBe(0);

		em.clear();
		const after = await em.find(
			Mention,
			{ post: { externalId: 'v2' } },
			{ populate: ['venue'], orderBy: { id: 'asc' } },
		);
		expect(after.map(m => [m.matchMethod, m.venue?.placeId ?? null])).toEqual([
			[MentionMatchMethodEnum.MANUAL, 'p-nhas'],
			[MentionMatchMethodEnum.IGNORED, null],
			[MentionMatchMethodEnum.MANUAL, null],
		]);
	});

	it("matches a second city's posts only against its own venues, with its own name and stopwords", async () => {
		const em = harness.orm.em;
		em.create(Venue, {
			city: munich.id,
			placeId: 'p-hisar-muc',
			name: 'Hisar Fresh Food München',
			category: 'Kebab shop',
		});
		const post = em.create(SocialPost, {
			city: munich.id,
			externalId: 'v3',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/v3',
			postedAt: new Date('2026-09-12T00:00:00Z'),
		});
		mention(post, 'Hisar Fresh Food', 'Munich');
		// Only Berlin has it: not a candidate in München
		mention(post, 'Nhas City Chicken');
		mention(post, 'Noma', 'Berlin');
		await em.flush();

		const counts = await match({ cityId: munich.id });
		expect(counts).toMatchObject({
			[MentionMatchMethodEnum.EXACT]: 1,
			[MentionMatchMethodEnum.NONE]: 1,
			[MentionMatchMethodEnum.OTHER_CITY]: 1,
		});
		em.clear();
		const after = await em.find(
			Mention,
			{ post: { externalId: 'v3' } },
			{ populate: ['venue'], orderBy: { id: 'asc' } },
		);
		expect(after.map(m => m.venue?.placeId ?? null)).toEqual(['p-hisar-muc', null, null]);
	});

	it('saves the sure matches in code and leaves a close call untouched for its own run', async () => {
		const em = harness.orm.em;
		const keller = em.create(Venue, {
			city: munich.id,
			placeId: 'p-augustiner',
			name: 'Augustiner Keller',
			category: 'Bavarian restaurant',
		});
		const post = em.create(SocialPost, {
			city: munich.id,
			externalId: 'v-close-call',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/v-close-call',
			postedAt: new Date('2026-09-12T00:00:00Z'),
		});
		mention(post, 'Augustiner Keller');
		const close = mention(post, 'Augustiner');
		await em.flush();
		generate.mockClear();

		// The code pass: the exact name saved, the close call only listed
		const pass = await service.match({ cityId: munich.id });
		expect(pass.counts[MentionMatchMethodEnum.EXACT]).toBe(1);
		expect(pass.asks).toEqual([close.id]);
		expect(generate).not.toHaveBeenCalled();
		em.clear();
		const exact = await em.findOneOrFail(
			Mention,
			{ venueName: 'Augustiner Keller' },
			{ populate: ['venue'] },
		);
		expect(exact.matchMethod).toBe(MentionMatchMethodEnum.EXACT);
		const waiting = await em.findOneOrFail(Mention, { id: close.id });
		expect(waiting.matchMethod ?? null).toBeNull();
		expect(waiting.matchedAt ?? null).toBeNull();
		// Listed again by the next pass until its own run saves it
		expect((await service.match({ cityId: munich.id })).asks).toEqual([close.id]);

		// Its own run: the question as plain data, the answer read from it alone, the save
		const plan = await service.planMention(close.id);
		if (!plan || !('question' in plan)) throw new Error('expected a question');
		expect(plan).toMatchObject({ cityId: munich.id, question: { kind: 'pick' } });
		expect(plan.question.offered.map(c => c.id)).toEqual([keller.id]);
		const decision = settleMatch(plan.question, { venueId: keller.id, branchId: null });
		expect(await service.saveMatch(close.id, decision)).toBe(MentionMatchMethodEnum.LLM);
		em.clear();
		expect(
			await em.findOneOrFail(Mention, { id: close.id }, { populate: ['venue'] }),
		).toMatchObject({ matchMethod: MentionMatchMethodEnum.LLM, venue: { id: keller.id } });
		expect((await service.match({ cityId: munich.id })).asks).toEqual([]);
	});

	it("never saves a close call's answer over an admin's correction made meanwhile", async () => {
		const em = harness.orm.em;
		const controller = harness.moduleRef.get(AdminSocialController);
		const post = em.create(SocialPost, {
			city: munich.id,
			externalId: 'v-corrected-meanwhile',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/v-corrected-meanwhile',
			postedAt: new Date('2026-09-13T00:00:00Z'),
		});
		const close = mention(post, 'Augustiner');
		await em.flush();
		const plan = await service.planMention(close.id);
		if (!plan || !('question' in plan)) throw new Error('expected a question');

		await controller.updateMention(close.id, { venueId: null, ignored: true });
		const keller = await em.findOneOrFail(Venue, { placeId: 'p-augustiner' });
		expect(
			await service.saveMatch(
				close.id,
				settleMatch(plan.question, { venueId: keller.id, branchId: null }),
			),
		).toBeNull();
		expect(await service.planMention(close.id)).toBeNull();
		em.clear();
		expect(await em.findOneOrFail(Mention, { id: close.id })).toMatchObject({
			matchMethod: MentionMatchMethodEnum.IGNORED,
			venue: null,
		});
	});
});
