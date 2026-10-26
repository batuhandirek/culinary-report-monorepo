import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportAnalysisAgent } from '../agents/report-analysis.agent.js';
import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { ReportSectionKindEnum as Kind } from '../constants/report-section.constant.js';
import { toOutput, toPublicOutput } from '../controllers/admin.reports.controller.js';
import { Report } from '../entities/report.entity.js';
import type { ReportAnalysisAnswer } from '../interfaces/report-analysis.interface.js';
import { ReportService } from '../services/report.service.js';
import { ReportConfigService } from '../services/report-config.service.js';
import { ReportEvidenceService } from '../services/report-evidence.service.js';
import { ReportTemplateService } from '../services/report-template.service.js';
import { ToolRun } from '../tools/tool-run.js';

const HIGHLIGHTS = { title: 'A month', headline: 'It went.', highlights: [], actions: [] };

/** An answer keyed to whatever observations the prompt carried, with one sound hypothesis each. */
const answerFor = (input: string): ReportAnalysisAnswer => {
	const { observations } = JSON.parse(input) as { observations: { key: string; sentence: string }[] };
	return {
		investigations: observations.map(o => ({
			key: o.key,
			whatHappened: o.sentence,
			hypotheses: [
				{
					reason: o.key === 'views' ? 'One post by @anna could have carried the month.' : 'Fewer creators may have posted.',
					confidence: 'possible',
					evidenceFor: [o.sentence],
					evidenceAgainst: [],
				},
			],
			cannotTell: null,
			worthChecking: ['Check whether @anna was invited.'],
		})),
		notes: 'Read the checks; nothing to look up.',
	};
};

describe('report analysis (pglite)', () => {
	let harness: PgliteTestingModule;
	let reports: ReportService;
	let configs: ReportConfigService;
	const highlightsAgent = mockAgent(HIGHLIGHTS);
	const replyAgent = mockAgent({ replies: [] });
	const analysisAgent = mockAgent((input: unknown) => answerFor(input as string));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				ReportTemplateService,
				ReportConfigService,
				ReportEvidenceService,
				CompetitorService,
				BrandService,
				CityService,
				{ provide: ReportHighlightsAgent, useValue: highlightsAgent },
				{ provide: ReviewReplyAgent, useValue: replyAgent },
				{ provide: ReportAnalysisAgent, useValue: analysisAgent },
			],
		});
		reports = harness.moduleRef.get(ReportService);
		configs = harness.moduleRef.get(ReportConfigService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		highlightsAgent.generate.mockClear();
		analysisAgent.generate.mockClear();
	});

	let n = 0;
	const post = (venue: Venue, postedAt: string, views: number, author = `fan${++n}`) => {
		const em = harness.orm.em;
		const p = em.create(SocialPost, {
			city: venue.city,
			externalId: `a${n}-${postedAt}`,
			platform: SocialPlatformEnum.INSTAGRAM,
			url: `https://example.com/${n}`,
			postedAt: new Date(`${postedAt}T12:00:00Z`),
			author,
			views,
		});
		em.create(Mention, {
			post: p,
			venueName: venue.name,
			venue,
			brand: venue.brand,
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
		});
	};

	/** A brand with ten quiet August posts and two loud September ones: views spike, posts dip. */
	const seed = async (name: string) => {
		const em = harness.orm.em;
		const city = testCity(em);
		const brand = await brandFactory.create({ name });
		const venue = await venueFactory.create({ name, district: 'Mitte' }, { associations: { city, brand } });
		for (let i = 1; i <= 10; i++) post(venue, `2026-08-${String(i + 3).padStart(2, '0')}`, 10_000);
		post(venue, '2026-09-11', 240_000, 'anna');
		post(venue, '2026-09-20', 60_000, 'ben');
		for (let i = 1; i <= 6; i++)
			em.create(Review, { reviewId: `${name}-r${i}`, venue, publishedAt: new Date(`2026-09-1${i}T12:00:00Z`), stars: 4, text: 'Fine' });
		await em.flush();
		return { city, brand, venue };
	};

	it('stores the observations with their checks, the investigations and the trace, and tells the highlights', async () => {
		const { city, brand } = await seed('Chén Chè');
		const report = await reports.build(brand.id, city.id, '2026-09');
		const analysis = report.analysis!;

		expect(analysis.observations.map(o => o.key)).toEqual(expect.arrayContaining(['views', 'posts']));
		const views = analysis.observations.find(o => o.key === 'views')!;
		expect(views).toMatchObject({ from: 100_000, to: 300_000, changePercent: 200, resolution: 'month' });
		expect(views.checks.map(c => c.question)).toContain('Which posts carried the month?');
		expect(views.checks[0]).toMatchObject({ verdict: 'supports' });
		expect(views.checks[0].answer).toContain('@anna on Instagram: 240k views');

		// Posts and creators fell together: one of them is investigated, the other folds into it
		const posts = analysis.observations.find(o => o.key === 'posts')!;
		expect(posts.related).toContain('creators');
		expect(analysis.investigations.map(i => i.key)).toEqual(
			analysis.observations.filter(o => o.key !== 'creators').slice(0, 4).map(o => o.key),
		);
		expect(analysis.investigations[0].hypotheses[0]).toMatchObject({ confidence: 'possible' });
		expect(analysis.investigations.every(i => !i.fallback)).toBe(true);
		expect(analysis.trace).toMatchObject({ model: 'openai/gpt-5.4', toolCalls: 0, notes: 'Read the checks; nothing to look up.', problems: [] });
		expect(analysis.trace.error).toBeUndefined();

		// The agent got the observations with their checks and the tools
		const [input, context, options] = analysisAgent.generate.mock.calls[0] as [string, { tools: Record<string, unknown>; cityName: string }, { abortSignal: AbortSignal }];
		const prompt = JSON.parse(input);
		expect(prompt.month).toBe('September 2026');
		expect(prompt.observations[0].checks.length).toBeGreaterThan(0);
		expect(prompt.observations[0].score).toBeUndefined();
		expect(Object.keys(context.tools).sort()).toEqual([
			'calendar',
			'city_theme_trend',
			'competitor',
			'history',
			'place',
			'posts',
			'press_and_comments',
			'reviews',
			'weekly_series',
		]);
		expect(options.abortSignal).toBeInstanceOf(AbortSignal);

		// The default (full) layout shows the section: the highlights quote the moves with their labels
		const highlightsInput = JSON.parse(highlightsAgent.generate.mock.calls[0][0] as string);
		expect(highlightsInput.whatMovedAndWhy).toHaveLength(analysis.investigations.length);
		expect(highlightsInput.whatMovedAndWhy[0].possibleReasons[0]).toMatch(/^possible: /);

		// The admin sees the trace, a shared link or the portal doesn't
		await harness.orm.em.populate(report, ['brand', 'city']);
		expect(toOutput(report).analysis?.trace).toBeDefined();
		expect('trace' in (toPublicOutput(report).analysis ?? {})).toBe(false);
		expect(toPublicOutput(report).analysis?.investigations).toHaveLength(analysis.investigations.length);
		expect((toPublicOutput(report) as { sentAt?: Date }).sentAt).toBeUndefined();
	});

	it('leaves the moves out of the highlights of a configuration without the section, cut to the limit with it', async () => {
		const { city, brand } = await seed('Bún Bò');
		const without = await configs.create(brand.id, { name: 'No analysis' });
		await configs.update(without.id, { sections: [{ kind: Kind.COVER }, { kind: Kind.POSTS }] });
		const one = await configs.create(brand.id, { name: 'One move' });
		await configs.update(one.id, { sections: [{ kind: Kind.COVER }, { kind: Kind.ANALYSIS, limit: 1 }] });

		const built = await reports.buildAll(brand.id, city.id, '2026-09');
		expect(built).toHaveLength(2);
		// One analysis for the build, stored on both
		expect(analysisAgent.generate).toHaveBeenCalledTimes(1);
		expect(built[0].analysis).toEqual(built[1].analysis);
		const inputs = highlightsAgent.generate.mock.calls.map(c => JSON.parse(c[0] as string));
		expect(inputs[0].whatMovedAndWhy).toBeUndefined();
		expect(inputs[1].whatMovedAndWhy).toHaveLength(1);
	});

	it('keeps the report when the agent fails, with fallbacks and the error in the trace', async () => {
		const { city, brand } = await seed('Pho Co');
		analysisAgent.generate.mockRejectedValueOnce(new Error('No OpenAI account can serve openai/gpt-5.4'));
		const report = await reports.build(brand.id, city.id, '2026-09');
		const analysis = report.analysis!;
		expect(analysis.trace.error).toBe('No OpenAI account can serve openai/gpt-5.4');
		expect(analysis.observations.length).toBeGreaterThan(0);
		expect(analysis.investigations.every(i => i.fallback && !i.hypotheses.length)).toBe(true);
		expect(analysis.investigations[0].whatHappened).toBe(analysis.observations[0].sentence);
		expect(highlightsAgent.generate).toHaveBeenCalledTimes(1);
	});

	it('drops what the check refuses and records it', async () => {
		const { city, brand } = await seed('Saigon Deli');
		analysisAgent.generate.mockImplementationOnce(async (input: unknown) => {
			const answer = answerFor(input as string);
			answer.investigations[0].hypotheses.push({
				reason: 'The dip was caused by rain.',
				confidence: 'likely',
				evidenceFor: ['It rained on 27 days.'],
				evidenceAgainst: [],
			});
			// Mastra's usage beside the object; the mock's type knows no usage
			return { object: answer, usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 } } as never;
		});
		const report = await reports.build(brand.id, city.id, '2026-09');
		const analysis = report.analysis!;
		expect(analysis.investigations[0].hypotheses).toHaveLength(1);
		expect(analysis.trace.problems).toEqual([{ where: expect.stringMatching(/hypothesis 2$/), problem: 'states a cause: "caused"' }]);
		expect(analysis.trace.usage).toEqual({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
	});

	it('skips the agent for a first report, and for a month where nothing moved', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const brand = await brandFactory.create({ name: 'First Timer' });
		const venue = await venueFactory.create({ name: 'First Timer' }, { associations: { city, brand } });
		post(venue, '2026-09-11', 1_000);
		await em.flush();
		const first = await reports.build(brand.id, city.id, '2026-09');
		expect(first.analysis).toMatchObject({ observations: [], investigations: [], trace: { skipped: 'no previous month' } });

		// August and September alike: a previous month, no move
		post(venue, '2026-08-11', 1_000);
		await em.flush();
		const quiet = await reports.build(brand.id, city.id, '2026-09');
		expect(quiet.analysis?.trace.skipped).toBe('no notable move');
		expect(analysisAgent.generate).not.toHaveBeenCalled();
	});

	it('analyses again on the stored data, on every sibling report, without touching the highlights', async () => {
		const em = harness.orm.em;
		const { city, brand } = await seed('Madame Ngo');
		await configs.create(brand.id, { name: 'First' });
		const second = await configs.create(brand.id, { name: 'Second' });
		await configs.update(second.id, { sections: [{ kind: Kind.COVER }, { kind: Kind.ANALYSIS }] });
		const [a, b] = await reports.buildAll(brand.id, city.id, '2026-09');
		expect(b).toBeDefined();
		const builtAt = a.analysis!.builtAt;
		highlightsAgent.generate.mockClear();

		analysisAgent.generate.mockImplementationOnce(async (input: unknown) => ({
			object: { ...answerFor(input as string), notes: 'Second look.' },
			usage: undefined,
		}));
		const again = await reports.analyseAgain(a.id);
		expect(again.analysis!.trace.notes).toBe('Second look.');
		expect(again.analysis!.builtAt >= builtAt).toBe(true);
		em.clear();
		const stored = await em.find(Report, { id: { $in: [a.id, b.id] } });
		expect(stored.map(r => r.analysis!.trace.notes)).toEqual(['Second look.', 'Second look.']);
		expect(stored.map(r => r.highlights.title)).toEqual(['A month', 'A month']);
		expect(highlightsAgent.generate).not.toHaveBeenCalled();
	});
});

describe('ToolRun', () => {
	it('runs calls up to its budget, traces every call and keeps every answer for the number check', async () => {
		const run = new ToolRun(2);
		expect(await run.take('posts', { a: 1 }, () => ({ posts: 3 }))).toEqual({ posts: 3 });
		expect(await run.take('reviews', {}, () => Promise.reject(new Error('boom')))).toEqual({ error: 'The tool failed: boom' });
		let ran = false;
		expect(await run.take('posts', {}, () => (ran = true))).toMatchObject({ error: expect.stringMatching(/^Call budget spent/) });
		expect(ran).toBe(false);
		expect(run.ran).toBe(2);
		expect(run.calls.map(c => c.tool)).toEqual(['posts', 'reviews', 'posts']);
		expect(run.given).toEqual([{ posts: 3 }]);
	});
});
