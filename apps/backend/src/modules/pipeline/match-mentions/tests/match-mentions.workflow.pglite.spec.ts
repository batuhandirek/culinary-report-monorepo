import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { HashtagService } from 'src/modules/social/services/hashtag.service.js';
import {
	type MatchAnswer,
	MentionMatchingService,
} from 'src/modules/social/services/mention-matching.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReadPostsWorkflow } from '../../read-posts/workflows/read-posts.workflow.js';
import { MATCH_MENTION_WORKFLOW } from '../constants/match-mentions.constant.js';
import { MATCH_MENTION_QUEUE } from '../queues/match-mentions.queue.js';
import { queueCloseCalls } from '../util/close-calls.js';
import { MatchMentionsWorkflow } from '../workflows/match-mentions.workflow.js';

/**
 * The matching as workflows, the facade faked to run a started workflow inline (DBOS can't run on
 * PGlite) and the durable agent call faked to `ask`: a post's places matched in code right after its
 * reading, its close calls queued one run in flight per mention; the city's sweep saving the sure
 * matches, every close call its own run on its own queue, one waiting on its agent call holding no
 * other back, a failed one counted while the rest are saved, the tags relinked once.
 */
describe('MatchMentionsWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: MatchMentionsWorkflow;
	let city: City;
	let keller: Venue;
	let hofbraeu: Venue;
	let n = 0;
	const durable = fakeDurable(() => [workflow]);
	// `VenueMatchAgent`'s stand-in, by the mention's name
	let answers: Record<string, () => Promise<MatchAnswer>> = {};
	const ask = jest.fn(async (message: string) => {
		const { mention } = JSON.parse(message) as { mention: { name: string } };
		const answer = answers[mention.name];
		if (!answer) throw new Error(`No answer for ${mention.name}`);
		return { object: await answer() };
	});
	const relink = jest.fn(async () => ({ tags: 0, changed: 0 }));

	const post = () =>
		harness.orm.em.create(SocialPost, {
			city,
			externalId: `m${++n}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/m${n}`,
			postedAt: new Date('2026-09-10T00:00:00Z'),
		});
	const mention = (venueName: string) =>
		harness.orm.em.create(Mention, { post: post(), venueName, visited: true });
	const read = (id: number) =>
		harness.orm.em.fork().findOneOrFail(Mention, { id }, { populate: ['venue'] });
	const until = async (check: () => Promise<boolean>) => {
		for (let i = 0; i < 250; i++) {
			if (await check()) return;
			await new Promise(resolve => setTimeout(resolve, 20));
		}
		throw new Error('Timed out');
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				MatchMentionsWorkflow,
				MentionMatchingService,
				CityService,
				{ provide: DurableWorkflowsService, useValue: durable },
				{
					provide: DurableLlmService,
					useValue: { generate: (_agent: unknown, message: string) => ask(message) },
				},
				{
					provide: ReadPostsWorkflow,
					useValue: {
						readCity: async () => ({ posts: 0, read: 0, skipped: 0, failed: 0 }),
					},
				},
				{ provide: HashtagService, useValue: { relink } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		workflow = harness.moduleRef.get(MatchMentionsWorkflow);
		city = await cityFactory.create({ name: 'München', nameStopwords: ['munchen'] });
		const em = harness.orm.em;
		keller = em.create(Venue, {
			city,
			placeId: 'p-keller',
			name: 'Augustiner Keller',
			category: 'Bavarian restaurant',
		});
		hofbraeu = em.create(Venue, {
			city,
			placeId: 'p-hofbraeu',
			name: 'Hofbräuhaus am Platzl',
			category: 'Bavarian restaurant',
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		await harness.orm.em.nativeDelete(Mention, {});
		await harness.orm.em.nativeDelete(SocialPost, {});
		harness.orm.em.clear();
		durable.started.length = 0;
		ask.mockClear();
		relink.mockClear();
		answers = {};
	});

	it('saves the sure matches at once and settles each close call in its own run, one waiting holding no other back', async () => {
		const em = harness.orm.em;
		const exact = mention('Augustiner Keller');
		const waiting = mention('Augustiner');
		const quick = mention('Hofbräuhaus');
		await em.flush();
		let release!: () => void;
		const released = new Promise<void>(resolve => (release = resolve));
		answers = {
			// No account can serve this one yet: its run waits
			Augustiner: async () => {
				await released;
				return { venueId: keller.id, branchId: null };
			},
			Hofbräuhaus: async () => ({ venueId: hofbraeu.id, branchId: null }),
		};

		const run = workflow.matchCity(city.id);
		await until(async () => (await read(quick.id)).matchMethod === MentionMatchMethodEnum.LLM);
		expect(await read(exact.id)).toMatchObject({
			matchMethod: MentionMatchMethodEnum.EXACT,
			venue: { id: keller.id },
		});
		const pending = await read(waiting.id);
		expect(pending.matchMethod ?? null).toBeNull();
		expect(pending.matchedAt ?? null).toBeNull();
		// Each close call its own run, on the queue of its own (the sweep holds the city queue's slot),
		// one in flight per mention: a post's reading may have queued it already
		expect(durable.started.map(s => s.args)).toEqual([[waiting.id], [quick.id]]);
		expect(durable.started.map(s => s.options)).toEqual(
			[waiting.id, quick.id].map(id =>
				expect.objectContaining({
					queue: MATCH_MENTION_QUEUE,
					dedupe: `mention-${id}`,
					onDuplicate: 'return-existing',
				}),
			),
		);

		release();
		const result = await run;
		expect(result).toMatchObject({ asked: 2, failed: 0 });
		expect(result.matched).toMatchObject({
			[MentionMatchMethodEnum.EXACT]: 1,
			[MentionMatchMethodEnum.LLM]: 2,
		});
		expect(await read(waiting.id)).toMatchObject({
			matchMethod: MentionMatchMethodEnum.LLM,
			venue: { id: keller.id },
		});
		// The code pass relinked the tags for what it decided, the sweep once more at its end; the
		// close calls never (each relinks only its own food topics)
		expect(relink).toHaveBeenCalledTimes(2);
	});

	it('counts a close call whose run failed and saves the others', async () => {
		const em = harness.orm.em;
		const failing = mention('Augustiner');
		const quick = mention('Hofbräuhaus');
		await em.flush();
		answers = {
			Augustiner: async () => {
				throw new Error('The answer does not fit the schema');
			},
			Hofbräuhaus: async () => ({ venueId: null, branchId: null }),
		};

		const result = await workflow.matchCity(city.id);
		expect(result).toMatchObject({ asked: 2, failed: 1 });
		expect(result.matched[MentionMatchMethodEnum.NONE]).toBe(1);
		expect((await read(quick.id)).matchMethod).toBe(MentionMatchMethodEnum.NONE);
		// Left as it was: the next pass lists it again, and an admin may resume its run
		expect((await read(failing.id)).matchedAt ?? null).toBeNull();
	});

	it('asks nothing when the code decides a close call after all', async () => {
		const em = harness.orm.em;
		const later = mention('Augustiner');
		await em.flush();
		const service = harness.moduleRef.get(MentionMatchingService);
		expect((await service.match({ cityId: city.id })).asks).toEqual([later.id]);
		// Read again meanwhile: the place is in another city, which the run's plan settles in code
		await em.nativeUpdate(Mention, { id: later.id }, { city: 'Berlin' });

		expect(await workflow.matchMention(later.id)).toEqual({
			method: MentionMatchMethodEnum.OTHER_CITY,
		});
		expect(ask).not.toHaveBeenCalled();
	});

	it("matches a post's places in code and lists its close calls, leaving the tags to the sweep", async () => {
		const em = harness.orm.em;
		const exact = mention('Augustiner Keller');
		const close = mention('Augustiner');
		const settled = mention('Hofbräuhaus am Platzl');
		const corrected = mention('Hofbräuhaus');
		await em.flush();
		await em.nativeUpdate(
			Mention,
			{ id: settled.id },
			{ matchMethod: MentionMatchMethodEnum.EXACT, matchedAt: new Date(), venue: hofbraeu.id },
		);
		await em.nativeUpdate(
			Mention,
			{ id: corrected.id },
			{ matchMethod: MentionMatchMethodEnum.IGNORED, matchedAt: null },
		);
		em.clear();

		const service = harness.moduleRef.get(MentionMatchingService);
		const pass = await service.matchMentions([exact.id, close.id, settled.id, corrected.id]);

		expect(pass.asks).toEqual([close.id]);
		expect(pass.counts[MentionMatchMethodEnum.EXACT]).toBe(1);
		expect(await read(exact.id)).toMatchObject({
			matchMethod: MentionMatchMethodEnum.EXACT,
			venue: { id: keller.id },
		});
		// Left for its own run, an admin's word left alone
		expect((await read(close.id)).matchedAt ?? null).toBeNull();
		expect((await read(corrected.id)).matchMethod).toBe(MentionMatchMethodEnum.IGNORED);
		// One post is no city-wide pass: every tag is relinked by the sweep, not here
		expect(relink).not.toHaveBeenCalled();
		expect(ask).not.toHaveBeenCalled();
	});

	it('queues a post\'s close calls by name, one run in flight per mention, none awaited', async () => {
		const enqueue = jest.fn(async () => ({}));
		await queueCloseCalls({ enqueue } as never, [11, 12], city.id);
		expect(enqueue.mock.calls).toEqual(
			[11, 12].map(id => [
				MATCH_MENTION_WORKFLOW,
				[id],
				{
					queue: MATCH_MENTION_QUEUE,
					dedupe: `mention-${id}`,
					onDuplicate: 'return-existing',
					attributes: { cityId: city.id, purpose: 'match-mentions' },
				},
			]),
		);
	});
});
