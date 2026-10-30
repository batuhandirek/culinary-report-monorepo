import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MentionExtractionAgent } from '../agents/mention-extraction.agent.js';
import { Mention } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

/* Extraction is told the food topics' labels, so a mention's cuisine uses the words reports group by,
   and stores whether the post said the place had just opened. */
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
				isNewOpening: true,
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
				TopicService,
				{ provide: MentionExtractionAgent, useValue: agent },
			],
		});
		service = harness.moduleRef.get(MentionExtractionService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedTopics(em, ['pho', 'kebab']);
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
			{ cityName: string; topics: string[] },
		];
		expect(context.cityName).toBe('Berlin');
		expect([...context.topics].sort()).toEqual([
			'Döner & kebab',
			'Pho',
			'Turkish',
			'Vietnamese',
		]);
		const mention = await harness.orm.em.findOneOrFail(Mention, { venueName: 'Pho House' });
		expect(mention.cuisine).toBe('Pho, Vietnamese');
		// The post said the place had just opened
		expect(mention.isNewOpening).toBe(true);
	});

	it('gives the agent a blog article as an article: the blog, its title and text', async () => {
		const em = harness.orm.em;
		agent.generate.mockClear();
		em.create(SocialPost, {
			city: testCity(em),
			externalId: 'blog_me2',
			platform: SocialPlatformEnum.BLOG,
			url: 'https://www.berlinfoodstories.com/top-lists/best-pho',
			author: 'berlinfoodstories.com',
			text: 'The best pho in Berlin\n\nPho House in Neukölln serves a broth that simmers for twelve hours.',
			postedAt: new Date('2026-09-11T12:00:00Z'),
		});
		await em.flush();

		expect(await service.extract({ limit: 10 })).toEqual({ analysed: 1, mentions: 1 });
		const [prompt] = agent.generate.mock.calls[0] as [string];
		expect(prompt).toBe(
			'Platform: blog article on berlinfoodstories.com\n\nArticle:\nThe best pho in Berlin\n\nPho House in Neukölln serves a broth that simmers for twelve hours.',
		);
	});
});
