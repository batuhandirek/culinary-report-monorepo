import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MentionExtractionAgent } from '../agents/mention-extraction.agent.js';
import { Mention } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

/* Extraction is told the food topics' labels, so a mention's cuisine uses the words reports group by. */
describe('MentionExtractionService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MentionExtractionService;
	const agent = mockAgent({
		isPromotional: false,
		mentions: [
			{
				venueName: 'Pho House',
				locationHint: 'Neukölln',
				cuisine: 'Pho, Vietnamese',
				city: 'Berlin',
				visited: true,
				sentiment: 'positive',
				summary: 'Great broth.',
				dishes: [],
				praise: [],
				complaints: [],
			},
		],
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				MentionExtractionService,
				FoodTopicService,
				{ provide: MentionExtractionAgent, useValue: agent },
			],
		});
		service = harness.moduleRef.get(MentionExtractionService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedFoodTopics(em, ['pho', 'kebab']);
		em.create(SocialPost, {
			city: testCity(em),
			externalId: 'me-1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/me/1',
			author: 'eater',
			views: 100,
			text: 'The best pho in Neukölln, the broth at Pho House is something else #berlinfood #pho',
			postedAt: new Date('2026-09-10T12:00:00Z'),
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("gives the agent the topics' labels and stores the cuisine it answers", async () => {
		expect(await service.extract({ limit: 10 })).toEqual({ analysed: 1, mentions: 1 });
		const [, context] = agent.generate.mock.calls[0] as [
			string,
			{ cityName: string; foodTopics: string[] },
		];
		expect(context.cityName).toBe('Berlin');
		expect([...context.foodTopics].sort()).toEqual([
			'Döner & kebab',
			'Pho',
			'Turkish',
			'Vietnamese',
		]);
		expect(
			(await harness.orm.em.findOneOrFail(Mention, { venueName: 'Pho House' })).cuisine,
		).toBe('Pho, Vietnamese');
	});
});
