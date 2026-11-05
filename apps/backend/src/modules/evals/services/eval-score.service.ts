import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';
import { createHash } from 'node:crypto';

import { PostClaimsAgent } from 'src/modules/social/agents/post-claims.agent.js';
import { claimLabelAspects, claimLabelsRules } from 'src/modules/statements/util/claim-labels.js';
import { TermTopicAgent } from 'src/modules/topics/agents/term-topic.agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { ReviewClaimsAgent } from 'src/modules/venues/agents/review-claims.agent.js';
import {
	nameSimilarity,
	namesSameHead,
	normalizeVenueName,
} from 'src/modules/venues/util/venue-names.js';
import { runPool } from 'src/shared/util/pool.js';

import { ClaimPairingAgent, type ClaimPairingInput } from '../agents/claim-pairing.agent.js';
import { PLACE_PAIR_SIMILARITY, STORED_RUN } from '../constants/eval.constant.js';
import type {
	CaseResult,
	EvalCase,
	EvalCaseKind,
	EvalClaim,
	PostCase,
	PostOutput,
	ReviewOutput,
	TermOutput,
} from '../interfaces/eval-case.interface.js';
import type { CaseTallies } from '../util/eval-compare.js';
import {
	readCases,
	readPairings,
	readResults,
	readRunJson,
	runLabels,
	writeCase,
	writePairings,
	writeRunFile,
} from '../util/eval-files.js';
import { renderReport, type RunScores, TAG_METRICS } from '../util/eval-report.js';
import { type EvalSplit, splitOf } from '../util/eval-sample.js';
import {
	type CaseScore,
	type Issue,
	mergeTallies,
	type Pairs,
	scoreClaims,
	scoreLabels,
	scorePost,
	scoreTerm,
	type Tally,
} from '../util/eval-score.js';

import type { Adjudications } from './eval-adjudication.service.js';
import { EvalCitiesService } from './eval-cities.service.js';
import type { EvalReading } from './eval-run.service.js';

/** Bumped when the pairing's instructions change, so cached pairs are asked again */
const PAIRING_VERSION = 'links-4-one-case';

/** The tally a ruled miss counts against */
const RULED_METRICS: Record<string, string> = {
	'claims.missed': 'claims.recall',
	'claims.extra': 'claims.precision',
	'parts.sentiment': 'parts.sentiment',
	'parts.aspect': 'parts.aspect',
	'parts.kind': 'parts.kind',
	'parts.amount': 'parts.amount',
	'change.false': 'change.precision',
	'change.missed': 'change.recall',
	'claims.subject': 'claims.subject',
	'claims.place': 'claims.place',
	'places.missed': 'places.recall',
	'places.extra': 'places.precision',
	'match.brand': 'match.brand',
	'match.branch': 'match.branch',
	'match_isolated.brand': 'match_isolated.brand',
	'match_isolated.branch': 'match_isolated.branch',
	'terms.topics': 'terms.exact',
	'terms.none': 'terms.none',
};

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/**
 * Scores a run against the references (`npm run eval -- score --label <name>`, also at the end of
 * `run`): the stored data is the run `stored`. Claims are paired by `ClaimPairingAgent` (the mini
 * tier), the pairs cached per case and content in the run's `pairings.json`, so scoring
 * again costs nothing; everything else is scored in code (`eval-score.ts`). Writes `scores.json`,
 * `issues.jsonl` and `report.md` in the run's directory.
 */
@Injectable()
export class EvalScoreService {
	private readonly logger = new Logger(EvalScoreService.name);

	constructor(
		private readonly topicService: TopicService,
		private readonly claimPairingAgent: ClaimPairingAgent,
		private readonly reviewClaimsAgent: ReviewClaimsAgent,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly termTopicAgent: TermTopicAgent,
		private readonly evalCities: EvalCitiesService,
	) {}

	async score(label: string): Promise<RunScores> {
		const index = await this.topicService.index();
		const rootOf = (aspect: string) => index.rootOf(aspect);
		const cases = readCases().filter(c => c.reference);
		const results = label === STORED_RUN ? undefined : readResults(label);
		const outputs = new Map(
			cases.map(
				c => [c.id, results ? (results.get(c.id) ?? null) : storedResult(c)] as const,
			),
		);
		// A source the run tried and got no answer for (the agent dropped or failed it) is read as
		// nothing: every claim and place missed, never left out of the scores
		let dropped = 0;
		for (const c of cases) {
			const r = outputs.get(c.id);
			if (!r || r.output || !r.error || c.kind === 'term') continue;
			dropped++;
			outputs.set(c.id, {
				...r,
				output:
					c.kind === 'review' ?
						{ claims: [] }
					:	({
							isPromotional: null as unknown as boolean,
							places: [],
							claims: [],
						} as PostOutput),
			});
		}
		const scorable = cases.filter(c => outputs.get(c.id)?.output);

		// The claims' pairs: cached by case and content, the rest asked for
		const pairings = readPairings(label);
		// The pairing's version is in the key: a new rule pairs every case again
		const keyOf = (input: ClaimPairingInput) =>
			`${input.id}:${sha1(PAIRING_VERSION + JSON.stringify(input))}`;
		// A run that labelled the reference's own claims pairs them one to one: nothing to ask
		const labelsOnly = (c: EvalCase) => outputs.get(c.id)?.claimsFrom === 'reference';
		const inputs = scorable.flatMap((c): ClaimPairingInput[] => {
			if (c.kind === 'term' || labelsOnly(c)) return [];
			const ref = c.reference!.claims;
			const got = (outputs.get(c.id)!.output as ReviewOutput | PostOutput).claims;
			return [{ id: c.id, reference: numbered(ref), produced: numbered(got) }];
		});
		const missing = inputs.filter(
			i => !pairings[keyOf(i)] && i.reference.length && i.produced.length,
		);
		if (missing.length) {
			this.logger.log(`Pairing the claims of ${missing.length} cases`);
			// One case a call: a call packing several cases drifts and mixes their claims
			await runPool(
				missing,
				10,
				async input => {
					const res = await this.claimPairingAgent.generate(
						JSON.stringify({ reference: input.reference, produced: input.produced }),
					);
					pairings[keyOf(input)] = res.object.pairs.map(
						p => [p.reference, p.produced] as [number, number],
					);
				},
				(input, e) => this.logger.warn(`Pairing ${input.id} failed: ${e.message}`),
			);
			writePairings(label, pairings);
		}
		const pairsOf = (id: string): Pairs => {
			const input = inputs.find(i => i.id === id);
			return input ? (pairings[keyOf(input)] ?? []) : [];
		};

		// Place names compared without the city's own words, as matching compares them ("Candela Berlin" is "Candela")
		const cityWords = new Map<string, ReadonlySet<string>>();
		for (const id of _.uniq(
			scorable.filter((c): c is PostCase => c.kind === 'post').map(c => c.source.cityId),
		))
			cityWords.set(id, await this.evalCities.words(id));
		// One name heading the other ("KaDeWe", "KaDeWe Kaufhaus des Westens") is the same place
		const similarityIn = (cityId: string) => (a: string, b: string) => {
			const [x, y] = [a, b].map(n => normalizeVenueName(n, cityWords.get(cityId)));
			return namesSameHead(x, y) ? 1 : nameSimilarity(x, y);
		};
		const scores = new Map<string, CaseScore>();
		for (const c of scorable) {
			const output = outputs.get(c.id)!.output!;
			if (c.kind !== 'term' && labelsOnly(c))
				scores.set(
					c.id,
					scoreLabels(
						c.id,
						c.reference!.claims,
						(output as ReviewOutput | PostOutput).claims,
						rootOf,
					),
				);
			else if (c.kind === 'review')
				scores.set(
					c.id,
					scoreClaims(
						c.id,
						c.reference!.claims,
						(output as ReviewOutput).claims,
						pairsOf(c.id),
						rootOf,
					),
				);
			else if (c.kind === 'post')
				scores.set(
					c.id,
					scorePost(
						c.id,
						c.reference!,
						output as PostOutput,
						pairsOf(c.id),
						similarityIn(c.source.cityId),
						PLACE_PAIR_SIMILARITY,
						rootOf,
					),
				);
			else
				scores.set(
					c.id,
					scoreTerm(c.id, c.source.name, c.reference!, output as TermOutput),
				);
		}

		const byKind: RunScores['byKind'] = {};
		for (const kind of ['review', 'post', 'term'] as EvalCaseKind[])
			byKind[kind] = mergeTallies(
				scorable.filter(c => c.kind === kind).map(c => scores.get(c.id)!.tally),
			);
		const byTag: RunScores['byTag'] = {};
		const tagsOf = (c: EvalCase) =>
			c.kind === 'post' ?
				[...c.tags, `size:${postSize(c.reference!.claims.length)}`]
			:	c.tags;
		for (const tag of _.uniq(scorable.filter(c => c.kind !== 'term').flatMap(tagsOf)))
			byTag[tag] = _.pick(
				mergeTallies(
					scorable.filter(c => tagsOf(c).includes(tag)).map(c => scores.get(c.id)!.tally),
				),
				TAG_METRICS,
			);
		const bySplit: RunScores['bySplit'] = { train: {}, test: {} };
		for (const split of ['train', 'test'] as EvalSplit[])
			for (const kind of ['review', 'post', 'term'] as EvalCaseKind[])
				bySplit[split][kind] = mergeTallies(
					scorable
						.filter(c => c.kind === kind && splitOf(c.id) === split)
						.map(c => scores.get(c.id)!.tally),
				);
		const models: RunScores['models'] = {};
		for (const c of scorable)
			for (const [agent, model] of Object.entries(outputs.get(c.id)!.models)) {
				models[agent] ??= {};
				models[agent][model] = (models[agent][model] ?? 0) + 1;
			}
		const specs = this.currentSpecs(index);
		const run: RunScores = {
			label,
			at: new Date().toISOString(),
			cases: {
				review: scorable.filter(c => c.kind === 'review').length,
				post: scorable.filter(c => c.kind === 'post').length,
				term: scorable.filter(c => c.kind === 'term').length,
			},
			unscored: cases.length - scorable.length,
			dropped,
			byKind,
			bySplit,
			byTag,
			models,
			tokens: _.sumBy(scorable, c => outputs.get(c.id)!.tokens),
			cachedTokens: _.sumBy(scorable, c => outputs.get(c.id)!.cachedTokens ?? 0),
			usd: _.sumBy(scorable, c => outputs.get(c.id)!.usd ?? 0),
			reading:
				label === STORED_RUN ? undefined : (
					readRunJson<EvalReading & Record<string, unknown>>(label, 'run.json')
				),
			staleReferences: cases.filter(c => c.reference!.specHash !== specs[c.kind](c)).length,
		};
		const issues: Issue[] = [...scores.values()].flatMap(s =>
			s.issues.map(i => ({ ...i, split: splitOf(i.caseId) })),
		);
		// The rulings on this very list of a case's misses: what they forgive counts as right
		const adjudications = readRunJson<Adjudications>(label, 'adjudications.json') ?? {};
		const ruled = scorable.filter(
			c =>
				adjudications[c.id] &&
				adjudications[c.id].issuesHash === sha1(JSON.stringify(scores.get(c.id)!.issues)),
		);
		if (ruled.length) {
			const forgiven = (c: EvalCase): Tally => {
				const tally = _.cloneDeep(scores.get(c.id)!.tally);
				for (const r of adjudications[c.id].rulings) {
					const key = RULED_METRICS[r.metric];
					if (r.verdict === 'agent_wrong' || !key || !tally[key]) continue;
					tally[key] = [Math.min(tally[key][0] + 1, tally[key][1]), tally[key][1]];
				}
				return tally;
			};
			const ids = new Set(ruled.map(c => c.id));
			run.adjusted = { cases: ruled.length, byKind: {} };
			for (const kind of ['review', 'post', 'term'] as EvalCaseKind[])
				run.adjusted.byKind[kind] = mergeTallies(
					scorable
						.filter(c => c.kind === kind)
						.map(c => (ids.has(c.id) ? forgiven(c) : scores.get(c.id)!.tally)),
				);
		}
		const others = runLabels()
			.map(l => readRunJson<RunScores>(l, 'scores.json'))
			.filter((r): r is RunScores => !!r && r.label !== label);
		// The stored data first, then the other runs, newest first
		const ordered = _.orderBy(
			others,
			[r => (r.label === STORED_RUN ? 0 : 1), r => r.at],
			['asc', 'desc'],
		).slice(0, 4);
		writeRunFile(label, 'scores.json', run);
		writeRunFile(
			label,
			'cases.json',
			Object.fromEntries(
				scorable.map(c => [
					c.id,
					{ kind: c.kind, tags: tagsOf(c), tally: scores.get(c.id)!.tally },
				]),
			) satisfies CaseTallies,
		);
		writeRunFile(label, 'issues.jsonl', issues.map(i => JSON.stringify(i)).join('\n') + '\n');
		writeRunFile(label, 'report.md', renderReport(run, ordered, issues));
		return run;
	}

	/**
	 * Marks references as written under the agents' rules now, without a model call: for a rules
	 * change that moved no right answer (wording, or text moved into coaching). Logged in each
	 * reference's `revisions`. Returns how many changed.
	 */
	async restamp(ids: string[] | undefined, note: string): Promise<number> {
		const index = await this.topicService.index();
		const specs = this.currentSpecs(index);
		let changed = 0;
		for (const c of readCases()) {
			if (!c.reference || (ids?.length && !ids.includes(c.id))) continue;
			const spec = specs[c.kind](c);
			if (c.reference.specHash === spec) continue;
			c.reference.specHash = spec;
			c.reference.revisions = [
				...(c.reference.revisions ?? []),
				{ at: new Date().toISOString(), by: 'restamp', note },
			];
			writeCase(c);
			changed++;
		}
		return changed;
	}

	/** Each kind's spec hash as the references compute it, from the agents' instructions now */
	private currentSpecs(index: TopicIndex): Record<EvalCaseKind, (c: EvalCase) => string> {
		// The labels' rules: what the claim-labels classifier is asked
		const specB = claimLabelsRules(claimLabelAspects(index));
		return {
			review: () => sha1(this.reviewClaimsAgent.rulesFor() + specB),
			post: c =>
				sha1(
					this.postClaimsAgent.rulesFor({
						cityName: (c as { source: { cityName: string } }).source.cityName,
					}) + specB,
				),
			term: () => sha1(this.termTopicAgent.rulesFor()),
		};
	}
}

/**
 * How much a post has to say, by its reference's claims: a long article reads differently from a
 * caption, and its many claims would otherwise outweigh the short posts in the totals
 */
export const postSize = (claims: number): 'small' | 'medium' | 'large' =>
	claims < 10 ? 'small'
	: claims < 30 ? 'medium'
	: 'large';

// With its quote: the source's own words anchor a link when two phrasings drift apart
const numbered = (claims: EvalClaim[]) =>
	claims.map((c, i) => ({ i, text: c.text, ...(c.quote && { quote: c.quote }) }));

/** The stored data as a run's result */
const storedResult = (c: EvalCase): CaseResult => {
	const base = { caseId: c.id, kind: c.kind, models: {}, tokens: 0 };
	if (c.kind === 'review') return { ...base, output: { claims: c.stored.claims } };
	if (c.kind === 'post')
		return {
			...base,
			output: {
				// Null for a post read before the flag: then it is not scored
				isPromotional: c.stored.isPromotional as boolean,
				places: c.stored.places,
				claims: c.stored.claims,
			},
		};
	// A wording never decided has nothing stored to score
	return {
		...base,
		output:
			c.stored.topics ? { topics: c.stored.topics, suggestion: c.stored.suggestion } : null,
	};
};
