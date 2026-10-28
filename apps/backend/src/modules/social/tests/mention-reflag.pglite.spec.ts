import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MentionExtractionAgent } from '../agents/mention-extraction.agent.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

const answer = (venueName: string, isNewOpening: boolean) => ({
	venueName,
	locationHint: null,
	cuisine: null,
	city: 'Berlin',
	visited: true,
	isNewOpening,
	sentiment: 'positive',
	summary: 'Liked it.',
	dishes: [],
	praise: [],
	complaints: [],
});

// The agent's answer per post, found by the caption's marker
const ANSWERS: Record<string, ReturnType<typeof answer>[]> = {
	'[p1]': [answer('PHO HOUSE', true), answer('Döner Palast', true), answer('Some New Bar', true)],
	'[p2]': [answer('Kiez Kaffee', false)],
	'[p3]': [answer('Lazy Bar', true), answer('Tacos Loco', true)],
};

/* The re-flag reads stored posts again for "just opened" only: it sets the flag on the mentions
   already there, adds none, and leaves the analysis, matches and admins' corrections alone. */
describe('MentionExtractionService.reflagOpenings (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MentionExtractionService;
	const agent = mockAgent((input: unknown) => {
		const marker = Object.keys(ANSWERS).find(k => String(input).includes(k));
		if (!marker) throw new Error(`unexpected post: ${String(input).slice(0, 80)}`);
		return { isPromotional: true, mentions: ANSWERS[marker] };
	});
	const cutoff = new Date('2026-10-21T23:00:00Z');
	let pho: Venue;
	let kaffee: Venue;

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
		const city = testCity(em);
		pho = venueFactory.build({ name: 'Pho House' }, { associations: { city } });
		kaffee = venueFactory.build({ name: 'Kiez Kaffee' }, { associations: { city } });
		const analysedAt = new Date('2026-10-15T12:00:00Z');
		const post = (n: number, views: number, postedAt: string, at = analysedAt) =>
			em.create(SocialPost, {
				city,
				externalId: `rf-${n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/rf/${n}`,
				author: 'eater',
				views,
				text: `Post [p${n}] about places in Berlin`,
				postedAt: new Date(postedAt),
				analysedAt: at,
				isPromotional: false,
				analysisTokens: 1234,
			});
		const mention = (p: SocialPost, venueName: string, extra: Partial<Mention> = {}) =>
			em.create(Mention, {
				post: p,
				venueName,
				visited: true,
				sentiment: 'positive',
				summary: 'Stored.',
				...extra,
			});
		const p1 = post(1, 300, '2026-10-05T12:00:00Z');
		mention(p1, 'Pho House', {
			venue: pho,
			matchMethod: MentionMatchMethodEnum.EXACT,
			matchScore: 1,
		});
		// An admin linked it to another venue
		mention(p1, 'Döner Palast', {
			venue: kaffee,
			matchMethod: MentionMatchMethodEnum.MANUAL,
			matchNote: 'the kiosk inside Kiez Kaffee',
		});
		const p2 = post(2, 200, '2026-10-06T12:00:00Z');
		mention(p2, 'Cafe Kiez Kaffee', {
			venue: kaffee,
			matchMethod: MentionMatchMethodEnum.EXACT,
			isNewOpening: true,
		});
		const p3 = post(3, 100, '2026-10-07T12:00:00Z');
		// An admin marked it as not a venue
		mention(p3, 'Lazy Bar', { matchMethod: MentionMatchMethodEnum.IGNORED });
		mention(p3, 'Taco Loco', { matchMethod: MentionMatchMethodEnum.NONE });
		// Out of scope: another month, no mentions, analysed after the flag existed
		mention(post(4, 900, '2026-09-20T12:00:00Z'), 'Pho House');
		post(5, 800, '2026-10-08T12:00:00Z');
		mention(
			post(6, 700, '2026-10-09T12:00:00Z', new Date('2026-10-22T04:00:00Z')),
			'Pho House',
		);
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('sets the flag on the matching stored mentions, most viewed first, page by page', async () => {
		const scope = { month: '2026-10', analysedBefore: cutoff, limit: 2 };
		const first = await service.reflagOpenings({ ...scope, offset: 0 });
		expect(first).toMatchObject({
			total: 3,
			posts: 2,
			read: 2,
			failed: 0,
			flaggedMentions: 2,
			flaggedPosts: 1,
			cleared: 1,
			unpaired: 0,
		});
		const second = await service.reflagOpenings({ ...scope, offset: 2 });
		// "Tacos Loco" is the post's one unpaired mention, "Taco Loco"; "Lazy Bar" is ignored
		expect(second).toMatchObject({
			total: 3,
			posts: 1,
			read: 1,
			flaggedMentions: 1,
			flaggedPosts: 1,
			cleared: 0,
			unpaired: 0,
		});
		expect(await service.reflagOpenings({ ...scope, offset: 3 })).toMatchObject({
			posts: 0,
			read: 0,
		});
		expect(agent.generate).toHaveBeenCalledTimes(3);

		const em = harness.orm.em.fork();
		const flags = Object.fromEntries(
			(await em.find(Mention, {}, { populate: ['post'] })).map(m => [
				`${m.post.externalId} ${m.venueName}`,
				m.isNewOpening,
			]),
		);
		expect(flags).toEqual({
			'rf-1 Pho House': true,
			'rf-1 Döner Palast': true,
			'rf-2 Cafe Kiez Kaffee': false,
			'rf-3 Lazy Bar': false,
			'rf-3 Taco Loco': true,
			'rf-4 Pho House': false,
			'rf-6 Pho House': false,
		});
	});

	it('creates no mention and leaves the analysis, matches and corrections as they were', async () => {
		const em = harness.orm.em.fork();
		expect(await em.count(Mention, { venueName: 'Some New Bar' })).toBe(0);
		expect(await em.count(Mention, {})).toBe(7);
		const corrected = await em.findOneOrFail(Mention, { venueName: 'Döner Palast' });
		expect(corrected).toMatchObject({
			matchMethod: MentionMatchMethodEnum.MANUAL,
			matchNote: 'the kiosk inside Kiez Kaffee',
		});
		expect(corrected.venue?.id).toBe(kaffee.id);
		const ignored = await em.findOneOrFail(Mention, { venueName: 'Lazy Bar' });
		expect(ignored).toMatchObject({ matchMethod: MentionMatchMethodEnum.IGNORED, venue: null });
		const matched = await em.findOneOrFail(Mention, {
			venueName: 'Pho House',
			post: { externalId: 'rf-1' },
		});
		expect(matched).toMatchObject({ matchMethod: MentionMatchMethodEnum.EXACT, matchScore: 1 });
		expect(matched.venue?.id).toBe(pho.id);
		// The agent answered promotional; the post's own analysis stays
		const p1 = await em.findOneOrFail(SocialPost, { externalId: 'rf-1' });
		expect(p1).toMatchObject({ isPromotional: false, analysisTokens: 1234 });
		expect(p1.analysedAt?.toISOString()).toBe('2026-10-15T12:00:00.000Z');
	});
	it('reads only the posts with a flagged mention when asked, whenever they were analysed', async () => {
		agent.generate.mockClear();
		// rf-1 and rf-3 carry a flag after the first pass; rf-2 and rf-6 none
		const res = await service.reflagOpenings({
			month: '2026-10',
			onlyFlagged: true,
			limit: 10,
			offset: 0,
		});
		expect(res).toMatchObject({ total: 2, posts: 2, read: 2 });
		expect(agent.generate).toHaveBeenCalledTimes(2);
	});
});
