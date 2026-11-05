import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PostClaimsAgent } from 'src/modules/social/agents/post-claims.agent.js';
import { VenueMatchAgent } from 'src/modules/social/agents/venue-match.agent.js';
import { postClaimsPrompt } from 'src/modules/social/util/post-claims-input.js';
import { claimLabelAspects, claimLabelsRules } from 'src/modules/statements/util/claim-labels.js';
import { TermTopicAgent } from 'src/modules/topics/agents/term-topic.agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { ReviewClaimsAgent } from 'src/modules/venues/agents/review-claims.agent.js';
import { reviewClaimsInput } from 'src/modules/venues/util/review-claims-input.js';
import { nameSimilarity, normalizeVenueName } from 'src/modules/venues/util/venue-names.js';
import { runPool } from 'src/shared/util/pool.js';

import { EvalAdjudicationAgent, type Verdict } from '../agents/eval-adjudication.agent.js';
import {
	PLACE_PAIR_SIMILARITY,
	REFERENCE_CONCURRENCY,
	REFERENCE_MAX_OUTPUT_TOKENS,
	REFERENCE_MODEL,
	REFERENCE_TIMEOUT_MS,
	STORED_RUN,
} from '../constants/eval.constant.js';
import type {
	EvalCase,
	EvalClaim,
	EvalPostClaim,
	EvalUsage,
	PostOutput,
	ReferenceClaim,
	ReferencePostClaim,
	ReviewOutput,
	TermOutput,
} from '../interfaces/eval-case.interface.js';
import { addUsage, costUsd, NO_USAGE, usageOf } from '../util/eval-cost.js';
import {
	readCases,
	readResults,
	readRunJson,
	runDir,
	writeCase,
	writeRunFile,
} from '../util/eval-files.js';
import { type Issue, pairPlaces } from '../util/eval-score.js';

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/** One disagreement as ruled */
export interface Ruling extends Issue {
	verdict: Verdict;
	reason: string;
}

/** A run's rulings per case, with the hash of the disagreements they ruled on (a new score asks again) */
export type Adjudications = Record<
	string,
	{ issuesHash: string; rulings: Ruling[]; appliedAt?: string }
>;

const compact = (c: EvalClaim | EvalPostClaim, i: number) => ({
	i,
	text: c.text,
	...('subject' in c && { subject: c.subject, place: c.place }),
	sentiment: c.sentiment,
	aspect: c.aspect,
	kind: c.kind,
	foods: c.foods,
	...(c.amount !== null && { amount: c.amount, unit: c.unit }),
});

/**
 * Rules on a run's disagreements with the references (`npm run eval -- adjudicate --label <name>`,
 * paid: Opus, one call a case with disagreements): agent wrong, reference wrong, or both fine. The
 * report then counts only the agent's errors (`after rulings`). `apply` folds what the rulings say
 * into the references: a claim the reference wrongly required becomes optional, a claim the agent
 * rightly added joins as optional, a part the reference got wrong takes the agent's, one where
 * both are fine is accepted too; a place or match ruling is noted only. Every change is logged in
 * the case's `reference.revisions`.
 */
@Injectable()
export class EvalAdjudicationService {
	private readonly logger = new Logger(EvalAdjudicationService.name);

	constructor(
		private readonly topicService: TopicService,
		private readonly adjudicationAgent: EvalAdjudicationAgent,
		private readonly reviewClaimsAgent: ReviewClaimsAgent,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly termTopicAgent: TermTopicAgent,
		private readonly venueMatchAgent: VenueMatchAgent,
	) {}

	async adjudicate(
		label: string,
		opts: { ids?: string[]; limit?: number; apply?: boolean } = {},
	): Promise<{
		ruled: number;
		cases: number;
		usage: EvalUsage;
		usd: number;
		applied: number;
		verdicts: Record<string, number>;
	}> {
		const issuesFile = path.join(runDir(label), 'issues.jsonl');
		if (!existsSync(issuesFile))
			throw new Error(`Run ${label} is not scored yet: score it first`);
		const issues = readFileSync(issuesFile, 'utf8')
			.split('\n')
			.filter(Boolean)
			.map(l => JSON.parse(l) as Issue);
		const byCase = _.groupBy(issues, i => i.caseId);
		const adjudications = readRunJson<Adjudications>(label, 'adjudications.json') ?? {};
		const cases = new Map(readCases().map(c => [c.id, c]));
		const results = label === STORED_RUN ? undefined : readResults(label);
		const index = await this.topicService.index();
		// The labels' rules: what the claim-labels classifier is asked
		const specB = claimLabelsRules(claimLabelAspects(index));

		const pending = Object.entries(byCase)
			.filter(
				([id, list]) =>
					(!opts.ids?.length || opts.ids.includes(id)) &&
					adjudications[id]?.issuesHash !== sha1(JSON.stringify(list)),
			)
			.slice(0, opts.limit);
		let usage = NO_USAGE;
		let ruled = 0;
		await runPool(
			pending,
			REFERENCE_CONCURRENCY,
			async ([id, list]) => {
				const c = cases.get(id);
				if (!c?.reference) return;
				const output = results ? results.get(id)?.output : storedOutput(c);
				if (!output) return;
				const spec =
					c.kind === 'review' ? this.reviewClaimsAgent.rulesFor() + '\n\n' + specB
					: c.kind === 'post' ?
						[
							this.postClaimsAgent.rulesFor({
								cityName: c.source.cityName,
								...(c.source.ownBrand && { ownBrand: c.source.ownBrand }),
							}),
							specB,
							this.venueMatchAgent.rulesFor(),
						].join('\n\n')
					:	this.termTopicAgent.rulesFor();
				const res = await this.adjudicationAgent.generate(
					JSON.stringify({
						source:
							c.kind === 'review' ? reviewClaimsInput(c.source.venue, c.source)
							: c.kind === 'post' ? postClaimsPrompt(c.source)
							: { wording: c.source.name },
						reference: referenceView(c),
						produced: producedView(c, output),
						disagreements: list.map((issue, n) => ({
							n,
							metric: issue.metric,
							detail: issue.detail,
						})),
					}),
					{ spec },
					{
						model: REFERENCE_MODEL,
						modelSettings: { maxOutputTokens: REFERENCE_MAX_OUTPUT_TOKENS },
						abortSignal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS),
					},
				);
				usage = addUsage(usage, usageOf(res));
				if (res.model !== REFERENCE_MODEL) {
					this.logger.error(
						`${id}: ruled by ${res.model}, not ${REFERENCE_MODEL}: discarded`,
					);
					return;
				}
				const rulings = new Map(res.object.rulings.map(r => [r.n, r]));
				adjudications[id] = {
					issuesHash: sha1(JSON.stringify(list)),
					rulings: list.flatMap((issue, n) => {
						const r = rulings.get(n);
						return r ? [{ ...issue, verdict: r.verdict, reason: r.reason }] : [];
					}),
				};
				ruled++;
			},
			([id], e) => this.logger.warn(`${id} failed: ${e.message}`),
		);
		writeRunFile(label, 'adjudications.json', adjudications);

		let applied = 0;
		if (opts.apply)
			for (const [id, entry] of Object.entries(adjudications)) {
				const c = cases.get(id);
				if (!c?.reference || entry.appliedAt) continue;
				const output = results ? results.get(id)?.output : storedOutput(c);
				if (!output) continue;
				const n = applyRulings(c, output, entry.rulings, label);
				if (n) {
					writeCase(c);
					applied += n;
				}
				entry.appliedAt = new Date().toISOString();
			}
		if (opts.apply) writeRunFile(label, 'adjudications.json', adjudications);
		const verdicts = _.countBy(
			Object.values(adjudications).flatMap(a => a.rulings),
			r => r.verdict,
		);
		return {
			ruled,
			cases: pending.length,
			usage,
			usd: costUsd(REFERENCE_MODEL, usage),
			applied,
			verdicts,
		};
	}
}

const storedOutput = (c: EvalCase): ReviewOutput | PostOutput | TermOutput | null =>
	c.kind === 'review' ? { claims: c.stored.claims }
	: c.kind === 'post' ?
		{
			isPromotional: c.stored.isPromotional ?? false,
			places: c.stored.places,
			claims: c.stored.claims,
		}
	: c.stored.topics ? { topics: c.stored.topics, suggestion: c.stored.suggestion }
	: null;

const referenceView = (c: EvalCase) =>
	c.kind === 'term' ? { topics: c.reference!.topics, alsoAcceptable: c.reference!.alsoAcceptable }
	: c.kind === 'post' ?
		{
			places: c.reference!.places.map((p, i) => ({
				i,
				venueName: p.venueName,
				match: p.match.brandName,
				branch: p.match.venueName,
			})),
			claims: c.reference!.claims.map((cl, i) => ({
				...compact(cl, i),
				optional: cl.optional,
				alsoAcceptable: cl.alsoAcceptable,
			})),
		}
	:	{
			claims: c.reference!.claims.map((cl, i) => ({
				...compact(cl, i),
				optional: cl.optional,
				alsoAcceptable: cl.alsoAcceptable,
			})),
		};

const producedView = (c: EvalCase, output: ReviewOutput | PostOutput | TermOutput) =>
	c.kind === 'term' ? output
	: c.kind === 'post' ?
		{
			places: (output as PostOutput).places.map((p, i) => ({
				i,
				venueName: p.venueName,
				match: p.match?.brandName ?? null,
				branch: p.match?.venueName ?? null,
			})),
			claims: (output as PostOutput).claims.map(compact),
		}
	:	{ claims: (output as ReviewOutput).claims.map(compact) };

/** Folds a case's rulings into its reference; returns how many changed it */
export const applyRulings = (
	c: EvalCase,
	output: ReviewOutput | PostOutput | TermOutput,
	rulings: Ruling[],
	label: string,
): number => {
	const ref = c.reference!;
	let changed = 0;
	const revise = (r: Ruling) => {
		ref.revisions = [
			...(ref.revisions ?? []),
			{
				at: new Date().toISOString(),
				by: `adjudication:${label}`,
				note: `${r.metric} (${r.verdict}): ${r.reason}`,
			},
		];
		changed++;
	};
	if (c.kind === 'term') {
		const got = (output as TermOutput).topics;
		const reference = c.reference!;
		for (const r of rulings.filter(x => x.verdict !== 'agent_wrong')) {
			if (r.verdict === 'reference_wrong') reference.topics = got;
			else
				reference.alsoAcceptable = _.uniq([
					...reference.alsoAcceptable,
					...got.map(t => t.key).filter(k => !reference.topics.some(t => t.key === k)),
				]);
			revise(r);
		}
		return changed;
	}
	const refClaims: ReferenceClaim[] = c.reference!.claims;
	const gotClaims: (EvalClaim | EvalPostClaim)[] = (output as ReviewOutput | PostOutput).claims;
	// A produced place's index on the reference's list, for a claim taken over from the agent
	const placeOf =
		c.kind === 'post' ?
			new Map(
				pairPlaces(
					c.reference!.places,
					(output as PostOutput).places,
					(a, b) => nameSimilarity(normalizeVenueName(a), normalizeVenueName(b)),
					PLACE_PAIR_SIMILARITY,
				).map(([i, j]) => [j, i]),
			)
		:	new Map<number, number>();
	for (const r of rulings) {
		if (r.verdict === 'agent_wrong') continue;
		const rc = r.ref !== undefined ? refClaims[r.ref] : undefined;
		const gc = r.got !== undefined ? gotClaims[r.got] : undefined;
		const keep = r.verdict === 'both_ok';
		switch (r.metric) {
			case 'claims.missed':
				if (rc) rc.optional = true;
				break;
			case 'claims.extra': {
				if (!gc) continue;
				// A reference names its foods (never "not read") and has no probabilities
				const { probability: _probability, ...parts } = gc;
				const extra = {
					...parts,
					foods: gc.foods ?? [],
					optional: true,
					alsoAcceptable: { sentiments: [], aspects: [], kinds: [] },
				};
				if ('subject' in gc) {
					const post = gc as EvalPostClaim;
					const place = post.place !== null ? placeOf.get(post.place) : null;
					if (post.subject === 'place' && place === undefined) continue;
					refClaims.push({
						...extra,
						subject: post.subject,
						place: place ?? null,
					} as ReferencePostClaim);
				} else refClaims.push(extra);
				break;
			}
			case 'parts.sentiment':
				if (!rc || !gc?.sentiment) continue;
				if (keep)
					rc.alsoAcceptable.sentiments = _.uniq([
						...rc.alsoAcceptable.sentiments,
						gc.sentiment,
					]);
				else rc.sentiment = gc.sentiment;
				break;
			case 'parts.aspect':
				if (!rc || !gc) continue;
				if (keep)
					rc.alsoAcceptable.aspects = _.uniq([
						...rc.alsoAcceptable.aspects,
						gc.aspect ?? 'none',
					]);
				else rc.aspect = gc.aspect;
				break;
			case 'parts.kind':
				if (!rc || !gc?.kind) continue;
				if (keep) rc.alsoAcceptable.kinds = _.uniq([...rc.alsoAcceptable.kinds, gc.kind]);
				else rc.kind = gc.kind;
				break;
			case 'change.false':
				if (!rc) continue;
				if (keep) rc.alsoAcceptable.kinds = _.uniq([...rc.alsoAcceptable.kinds, 'change']);
				else rc.kind = 'change';
				break;
			case 'parts.amount':
				if (!rc || !gc || keep) continue;
				rc.amount = gc.amount;
				rc.unit = gc.unit;
				break;
			case 'parts.foods':
				// Foods never read (a classifier's claim) raise no foods miss to rule on
				if (!rc || !gc || keep || gc.foods === null) continue;
				rc.foods = gc.foods;
				break;
			default:
				// Places, matches, subjects: ruled, noted, never rewritten by code
				break;
		}
		revise(r);
	}
	return changed;
};
