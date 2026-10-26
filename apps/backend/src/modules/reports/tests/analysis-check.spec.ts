import { describe, expect, it } from '@jest/globals';

import type { ReportAnalysisAnswer, ReportObservation } from '../interfaces/report-analysis.interface.js';
import { analysisLineProblem, checkAnalysis } from '../util/analysis-check.js';

const observation = (key: string, extra: Partial<ReportObservation> = {}): ReportObservation => ({
	key,
	metric: 'views',
	kind: 'spike',
	month: '2026-09',
	label: 'Views',
	source: 'TikTok and Instagram',
	unit: 'views',
	from: 197_100,
	to: 978_800,
	change: 781_700,
	changePercent: 397,
	comparedWith: 'August 2026',
	resolution: 'month',
	series: [
		{ at: '2026-08', value: 197_100 },
		{ at: '2026-09', value: 978_800 },
	],
	sentence: 'Views of posts by others went from 197.1k in August 2026 to 978.8k in September 2026 (+781.7k, +397%).',
	score: 3,
	checks: [{ question: 'Which posts carried the month?', answer: '@anna: 540k views.', verdict: 'supports', resolution: 'day' }],
	...extra,
});

const answer = (investigations: ReportAnalysisAnswer['investigations']): ReportAnalysisAnswer => ({ investigations, notes: 'notes' });

describe('analysisLineProblem', () => {
	const given = [197_100, 978_800, 397];

	it('lets a line through when its numbers were given and it states a possibility', () => {
		expect(analysisLineProblem('Views rose to 979k (+397%) and could have come from one post.', given, 30)).toBeNull();
	});

	it('names what is wrong', () => {
		expect(analysisLineProblem('', given, 30)).toBe('empty');
		expect(analysisLineProblem('one two three four', given, 3)).toBe('over 3 words');
		expect(analysisLineProblem('A viral month.', given, 30)).toBe('says viral');
		expect(analysisLineProblem('Views rose because of one post.', given, 30)).toBe('states a cause: "because"');
		expect(analysisLineProblem('Views rose to 1.2M.', given, 30)).toBe('states 1200000, which it was not given');
	});
});

describe('checkAnalysis', () => {
	it('keeps a sound investigation, in the observations\' order', () => {
		const problems: string[] = [];
		const out = checkAnalysis(
			answer([
				{
					key: 'reviews',
					whatHappened: 'Reviews went from 12 to 31.',
					hypotheses: [],
					cannotTell: null,
					worthChecking: [],
				},
				{
					key: 'views',
					whatHappened: 'Views went from 197k in August 2026 to 979k in September 2026 (+397%).',
					hypotheses: [
						{
							reason: 'One post by @anna could have carried the month.',
							confidence: 'likely',
							evidenceFor: ['@anna reached 540k views on TikTok.'],
							evidenceAgainst: [],
						},
					],
					cannotTell: null,
					worthChecking: ['Check whether @anna was invited.'],
				},
			]),
			[observation('views'), observation('reviews', { metric: 'reviews', from: 12, to: 31, change: 19, sentence: 'Reviews went from 12 to 31.' })],
			[{ posts: [{ views: 540_000 }] }],
			(where, problem) => problems.push(`${where}: ${problem}`),
		);
		expect(out.map(i => i.key)).toEqual(['views', 'reviews']);
		expect(out[0].hypotheses[0].confidence).toBe('likely');
		expect(out[0].worthChecking).toEqual(['Check whether @anna was invited.']);
		expect(out[0].fallback).toBeUndefined();
		expect(problems).toEqual([]);
	});

	it('drops a hypothesis stating a cause or a stray number, and a bad evidence line alone', () => {
		const problems: string[] = [];
		const [out] = checkAnalysis(
			answer([
				{
					key: 'views',
					whatHappened: 'Views went from 197k to 979k (+397%).',
					hypotheses: [
						{ reason: 'The rise was caused by one post.', confidence: 'likely', evidenceFor: [], evidenceAgainst: [] },
						{ reason: 'Views may have followed 12 new posts.', confidence: 'possible', evidenceFor: [], evidenceAgainst: [] },
						{
							reason: 'One post could have carried the month.',
							confidence: 'possible',
							evidenceFor: ['@anna reached 540k views.', 'Another post reached 800k views.'],
							evidenceAgainst: [],
						},
					],
					cannotTell: null,
					worthChecking: [],
				},
			]),
			[observation('views')],
			[{ views: 540_000 }],
			(where, problem) => problems.push(`${where}: ${problem}`),
		);
		expect(out.hypotheses).toHaveLength(1);
		expect(out.hypotheses[0].evidenceFor).toEqual(['@anna reached 540k views.']);
		expect(problems).toEqual([
			'views · hypothesis 1: states a cause: "caused"',
			'views · hypothesis 2: states 12, which it was not given',
			'views · hypothesis 3 evidence for 2: states 800000, which it was not given',
		]);
	});

	it("falls back to the observation's sentence when whatHappened fails, and downgrades a likely without evidence", () => {
		const problems: string[] = [];
		const [out] = checkAnalysis(
			answer([
				{
					key: 'views',
					whatHappened: 'Views went up 50%.',
					hypotheses: [{ reason: 'A creator may have posted.', confidence: 'likely', evidenceFor: [], evidenceAgainst: [] }],
					cannotTell: 'We cannot see who shared the post.',
					worthChecking: [],
				},
			]),
			[observation('views')],
			[],
			(where, problem) => problems.push(`${where}: ${problem}`),
		);
		expect(out.whatHappened).toBe(observation('views').sentence);
		expect(out.fallback).toBe(true);
		expect(out.hypotheses[0].confidence).toBe('possible');
		expect(out.cannotTell).toBe('We cannot see who shared the post.');
		expect(problems).toEqual([
			'views · whatHappened: states 50, which it was not given',
			'views · hypothesis 1: likely without evidence for it: downgraded to possible',
		]);
	});

	it('gives every observation its fallback when the agent failed, and one the model skipped too', () => {
		const problems: string[] = [];
		const failed = checkAnalysis(null, [observation('views')], [], (where, problem) => problems.push(`${where}: ${problem}`));
		expect(failed).toEqual([{ key: 'views', whatHappened: observation('views').sentence, hypotheses: [], worthChecking: [], fallback: true }]);
		expect(problems).toEqual([]);

		const skipped = checkAnalysis(answer([]), [observation('views')], [], (where, problem) => problems.push(`${where}: ${problem}`));
		expect(skipped[0].fallback).toBe(true);
		expect(problems).toEqual(['views: no investigation returned']);
	});
});
