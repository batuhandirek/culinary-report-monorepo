import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { VenueMatchAgent } from '../agents/venue-match.agent.js';
import { AdminSocialController } from '../controllers/admin.social.controller.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';

describe('MentionMatchingService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MentionMatchingService;
	let berlin: City;
	let munich: City;
	const generate = jest.fn(async () => ({ object: { venueId: null } }));

	const mention = (post: SocialPost, venueName: string, city: string | null = null) =>
		harness.orm.em.create(Mention, {
			post,
			venueName,
			city,
			visited: true,
			sentiment: 'positive',
			summary: 'Nice.',
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				MentionMatchingService,
				CityService,
				AdminSocialController,
				{ provide: VenueMatchAgent, useValue: { generate } },
			],
		});
		service = harness.moduleRef.get(MentionMatchingService);
		entityManagerManager.setEntityManager(harness.orm.em);
		berlin = await cityFactory.create({ name: 'Berlin', nameStopwords: ['berlin'] });
		munich = await cityFactory.create({ name: 'München', aliases: ['Munich'], nameStopwords: ['munchen', 'munich'] });
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('links an exact name, leaves another city out, and asks the LLM only for close calls', async () => {
		const em = harness.orm.em;
		em.create(Venue, { city: berlin.id, placeId: 'p-hisar', name: 'Hisar fresh food', category: 'Kebab shop' });
		em.create(Venue, { city: berlin.id, placeId: 'p-nhas', name: 'Nhas City Chicken', category: 'Chicken restaurant' });
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

		const counts = await service.match();
		expect(counts).toMatchObject({
			[MentionMatchMethodEnum.EXACT]: 1,
			[MentionMatchMethodEnum.OTHER_CITY]: 1,
			[MentionMatchMethodEnum.NONE]: 2,
		});
		// "City Chicken" had a candidate (the LLM said no); "Noma" had none to ask about
		expect(generate).toHaveBeenCalledTimes(1);

		em.clear();
		const hisar = await em.findOneOrFail(Mention, { venueName: 'Hisar Fresh Food' }, { populate: ['venue'] });
		expect(hisar.venue?.name).toBe('Hisar fresh food');
	});

	it('only retries unmatched mentions once new venues arrive', async () => {
		generate.mockClear();
		expect(Object.values(await service.match()).reduce((a, b) => a + b, 0)).toBe(0);

		harness.orm.em.create(Venue, { city: berlin.id, placeId: 'p-noma', name: 'Noma', category: 'Restaurant' });
		await harness.orm.em.flush();
		const counts = await service.match();
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
		await service.match();

		const out = await controller.updateMention(relinked.id, { venueId: nhas.id, note: 'Wrong Hisar' });
		expect(out).toMatchObject({
			venue: { id: nhas.id },
			matchMethod: MentionMatchMethodEnum.MANUAL,
			matchNote: 'Wrong Hisar',
		});
		// `ignored` wins over a venue
		await controller.updateMention(ignored.id, { venueId: hisar.id, ignored: true });
		await controller.updateMention(unlinked.id, { venueId: null });

		const counts = await service.match({ rematch: true });
		expect(counts[MentionMatchMethodEnum.MANUAL]).toBe(0);
		expect(counts[MentionMatchMethodEnum.IGNORED]).toBe(0);

		em.clear();
		const after = await em.find(Mention, { post: { externalId: 'v2' } }, { populate: ['venue'], orderBy: { id: 'asc' } });
		expect(after.map(m => [m.matchMethod, m.venue?.placeId ?? null])).toEqual([
			[MentionMatchMethodEnum.MANUAL, 'p-nhas'],
			[MentionMatchMethodEnum.IGNORED, null],
			[MentionMatchMethodEnum.MANUAL, null],
		]);
	});

	it("matches a second city's posts only against its own venues, with its own name and stopwords", async () => {
		const em = harness.orm.em;
		em.create(Venue, { city: munich.id, placeId: 'p-hisar-muc', name: 'Hisar Fresh Food München', category: 'Kebab shop' });
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

		const counts = await service.match({ cityId: munich.id });
		expect(counts).toMatchObject({
			[MentionMatchMethodEnum.EXACT]: 1,
			[MentionMatchMethodEnum.NONE]: 1,
			[MentionMatchMethodEnum.OTHER_CITY]: 1,
		});
		em.clear();
		const after = await em.find(Mention, { post: { externalId: 'v3' } }, { populate: ['venue'], orderBy: { id: 'asc' } });
		expect(after.map(m => m.venue?.placeId ?? null)).toEqual(['p-hisar-muc', null, null]);
	});

	it('saves the exact matches and leaves the close calls for later when the LLM account fails', async () => {
		const em = harness.orm.em;
		em.create(Venue, { city: munich.id, placeId: 'p-augustiner', name: 'Augustiner Keller', category: 'Bavarian restaurant' });
		const post = em.create(SocialPost, {
			city: munich.id,
			externalId: 'v-llm-down',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/v-llm-down',
			postedAt: new Date('2026-09-12T00:00:00Z'),
		});
		mention(post, 'Augustiner Keller');
		mention(post, 'Augustiner');
		await em.flush();
		const noCredits = new Error('You have no credits remaining. Add credits to continue using the API');
		generate.mockImplementation(async () => {
			throw noCredits;
		});

		try {
			await expect(service.match({ cityId: munich.id })).rejects.toBe(noCredits);
		} finally {
			generate.mockImplementation(async () => ({ object: { venueId: null } }));
		}

		em.clear();
		const exact = await em.findOneOrFail(Mention, { venueName: 'Augustiner Keller' }, { populate: ['venue'] });
		expect(exact.matchMethod).toBe(MentionMatchMethodEnum.EXACT);
		// Never decided: picked up again by the next run
		const close = await em.findOneOrFail(Mention, { venueName: 'Augustiner' });
		expect(close.matchMethod ?? null).toBeNull();
		expect(close.matchedAt ?? null).toBeNull();
	});
});
