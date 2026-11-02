import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ClaimPartsAgent } from 'src/modules/statements/agents/claim-parts.agent.js';
import { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementService } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { partTopicKeys } from 'src/modules/statements/util/statement-views.js';
import { TermService } from 'src/modules/topics/services/term.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PostClaimsAgent } from '../agents/post-claims.agent.js';
import { PostGateAgent } from '../agents/post-gate.agent.js';
import { Mention } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

import { gateAgent } from './factories/post-gate.mock.js';

/* Extraction is told the food topics' labels, so a mention's cuisine uses the words reports group by,
   and stores whether the post said the place had just opened. Agent A answers the places (mentions)
   and the claims (statements: about a place, the city or nothing); agent B reads each claim's parts
   right after. */
describe('MentionExtractionService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MentionExtractionService;
	const agent = mockAgent({
		isPromotional: false,
		places: [
			{
				venueName: 'Pho House',
				locationHint: 'Neukölln',
				cuisine: 'Pho, Vietnamese',
				city: 'Berlin',
				visited: true,
				isNewOpening: true,
			},
		],
		claims: [
			// The caption's own words: kept as the quote
			{
				text: 'the broth at Pho House is something else',
				quote: 'the broth at Pho House is something else',
				subject: 'place',
				place: 0,
			},
			// A quote the post never said (a translation): dropped
			{
				text: 'the pho cost 14 euros',
				quote: 'die Pho kostet 14 Euro',
				subject: 'place',
				place: 0,
			},
			// About the city, no place: a statement without a mention
			{
				text: 'Neukölln has the best pho',
				quote: 'The best pho in Neukölln',
				subject: 'city',
				place: null,
			},
			// A place index the answer has no place for: about nothing
			{ text: 'went on a Tuesday', quote: null, subject: 'place', place: 7 },
		],
	});
	// Agent B, as a function of the claims it is sent
	const partsAgent = mockAgent((input: unknown) => {
		// One source a call
		const sources = [JSON.parse(input as string)] as {
			claims: { id: string; text: string }[];
		}[];
		return {
			claims: sources.flatMap(s =>
				s.claims.map(c => ({
					id: c.id,
					sentiment:
						c.text.includes('cost') || c.text.includes('Tuesday') ?
							'neutral'
						:	'positive',
					aspect:
						c.text.includes('cost') ? 'price_level'
						: c.text.includes('broth') ? 'taste'
						: null,
					foods:
						c.text.includes('broth') ? ['broth']
						: c.text.includes('pho') ? ['pho']
						: [],
					amount: c.text.includes('cost') ? 14 : null,
					unit: c.text.includes('cost') ? 'money' : null,
					kind:
						c.text.includes('cost') || c.text.includes('Tuesday') ? 'fact' : 'opinion',
				})),
			),
		};
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				MentionExtractionService,
				TopicService,
				TermService,
				StatementService,
				StatementPartsService,
				{ provide: PostClaimsAgent, useValue: agent },
				{ provide: PostGateAgent, useValue: gateAgent() },
				{ provide: ClaimPartsAgent, useValue: partsAgent },
			],
		});
		service = harness.moduleRef.get(MentionExtractionService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedTopics(em, ['pho', 'kebab', 'price_level', 'taste']);
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
		expect(await service.extract({ limit: 10 })).toEqual({
			analysed: 1,
			mentions: 1,
			skipped: 0,
		});
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

	it("stores the claims as the post's statements: about the place it names (its mention), the city, or nothing, with the parts agent B read", async () => {
		const em = harness.orm.em.fork();
		const post = await em.findOneOrFail(SocialPost, { externalId: 'me-1' });
		const statements = await em.find(
			Statement,
			{ post },
			{
				orderBy: { id: 'asc' },
				populate: ['mention', 'parts.topic.parent', 'parts.term.topics.topic'],
			},
		);
		expect(
			statements.map(s => ({
				text: s.text,
				quote: s.quote ?? null,
				subject: s.subject,
				mention: s.mention?.venueName ?? null,
				sentiment: s.sentiment,
				kind: s.kind,
				amount: s.amount,
				unit: s.unit,
				month: s.month,
				parts: s.parts
					.getItems()
					.map(p => [p.role, p.topic?.key ?? p.term?.name, partTopicKeys(p)]),
			})),
		).toEqual([
			{
				text: 'the broth at Pho House is something else',
				quote: 'the broth at Pho House is something else',
				subject: 'place',
				mention: 'Pho House',
				sentiment: 'positive',
				kind: 'opinion',
				amount: null,
				unit: null,
				month: '2026-09',
				// "broth" is a wording nothing links yet: a term with no topics until decided
				parts: [
					['aspect', 'taste', ['taste']],
					['food', 'broth', []],
				],
			},
			{
				text: 'the pho cost 14 euros',
				quote: null,
				subject: 'place',
				mention: 'Pho House',
				sentiment: 'neutral',
				kind: 'fact',
				amount: 14,
				unit: 'money',
				month: '2026-09',
				parts: [
					['aspect', 'price_level', ['price_level']],
					// "pho" names the topic as a whole: the term's link is the part's topic
					['food', 'pho', ['pho']],
				],
			},
			{
				text: 'Neukölln has the best pho',
				quote: 'The best pho in Neukölln',
				subject: 'city',
				mention: null,
				sentiment: 'positive',
				kind: 'opinion',
				amount: null,
				unit: null,
				month: '2026-09',
				parts: [['food', 'pho', ['pho']]],
			},
			{
				text: 'went on a Tuesday',
				quote: null,
				subject: 'none',
				mention: null,
				sentiment: 'neutral',
				kind: 'fact',
				amount: null,
				unit: null,
				month: '2026-09',
				parts: [],
			},
		]);
		expect(statements.every(s => s.sourceKind === 'post' && s.partsAt)).toBe(true);
		// One call a source: the place's claims, the city's, the rest
		expect(partsAgent.generate).toHaveBeenCalledTimes(3);
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

		expect(await service.extract({ limit: 10 })).toEqual({
			analysed: 1,
			mentions: 1,
			skipped: 0,
		});
		const [prompt] = agent.generate.mock.calls[0] as [string];
		expect(prompt).toBe(
			'Platform: blog article on berlinfoodstories.com\n\nArticle:\nThe best pho in Berlin\n\nPho House in Neukölln serves a broth that simmers for twelve hours.',
		);
	});

	it('reads a long article in parts: its places first, then each part with that list, merged into one post', async () => {
		const em = harness.orm.em;
		const fixed = agent.generate.getMockImplementation()!;
		const place = (venueName: string) => ({
			venueName,
			locationHint: null,
			cuisine: null,
			city: 'Berlin',
			visited: true,
			isNewOpening: false,
		});
		agent.generate.mockClear();
		agent.generate.mockImplementation(async (...args: unknown[]) => {
			const prompt = args[0] as string;
			const object =
				prompt.includes('give no claims') ?
					{ isPromotional: false, places: [place('Pho House')], claims: [] }
				: prompt.includes('part 1 of 2') ?
					{
						isPromotional: false,
						places: [place('Pho House')],
						claims: [
							{
								text: 'the broth at Pho House simmers for twelve hours',
								quote: null,
								subject: 'place',
								place: 0,
							},
						],
					}
				:	{
						isPromotional: false,
						// The list echoed, then a place only this part names
						places: [place('Pho House'), place('Curry 36')],
						claims: [
							{
								text: 'Curry 36 has the best currywurst',
								quote: null,
								subject: 'place',
								place: 1,
							},
							{
								text: 'Pho House is worth the queue',
								quote: null,
								subject: 'place',
								place: 0,
							},
						],
					};
			return { object, usage: { totalTokens: 100 }, model: 'openai/mock-model' } as never;
		});
		const filler = (topic: string) =>
			Array.from(
				{ length: 28 },
				(_, i) => `${topic} sentence number ${i + 1} goes on about it.`,
			).join(' ');
		const post = em.create(SocialPost, {
			city: testCity(em),
			externalId: 'blog_long',
			platform: SocialPlatformEnum.BLOG,
			url: 'https://www.berlinfoodstories.com/top-lists/long',
			author: 'berlinfoodstories.com',
			text: `Pho House in Neukölln. ${filler('Pho')}\n\nCurry 36 in Kreuzberg. ${filler('Curry')}`,
			postedAt: new Date('2026-09-12T12:00:00Z'),
		});
		await em.flush();
		try {
			expect(await service.extract({ limit: 10 })).toEqual({
				analysed: 1,
				mentions: 2,
				skipped: 0,
			});
		} finally {
			agent.generate.mockImplementation(fixed);
		}
		// One pass for the places, one per part
		expect(agent.generate).toHaveBeenCalledTimes(3);
		const mentions = await em.find(Mention, { post }, { orderBy: { venueName: 'asc' } });
		expect(mentions.map(m => m.venueName)).toEqual(['Curry 36', 'Pho House']);
		const statements = await em.find(Statement, { post }, { populate: ['mention'] });
		expect(
			statements
				.map(st => [st.text, st.mention?.venueName ?? null])
				.sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
		).toEqual([
			['Curry 36 has the best currywurst', 'Curry 36'],
			['Pho House is worth the queue', 'Pho House'],
			['the broth at Pho House simmers for twelve hours', 'Pho House'],
		]);
		expect(post.analysisTokens).toBe(300);
	});
});
