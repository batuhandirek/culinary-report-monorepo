import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { DecisionModelId } from 'src/modules/llm/constants/decision-models.constant.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import { DecisionModelsService } from 'src/modules/llm/services/decision-models.service.js';
import { VenueMatchAgent } from 'src/modules/pipeline/match-mentions/agents/venue-match.agent.js';
import { PostClaimsAgent } from 'src/modules/pipeline/read-posts/agents/post-claims.agent.js';
import { readPostClaims } from 'src/modules/pipeline/read-posts/util/post-claims-read.js';
import { ReviewClaimsAgent } from 'src/modules/pipeline/read-reviews/agents/review-claims.agent.js';
import { reviewClaimsInput } from 'src/modules/pipeline/read-reviews/util/review-claims-input.js';
import {
	decideMatch,
	type MatchInput,
} from 'src/modules/social/services/mention-matching.service.js';
import { ClaimLabelsClassifier } from 'src/modules/statements/classifiers/claim-labels.classifier.js';
import type { StatementUnit } from 'src/modules/statements/entities/statement.entity.js';
import { AspectShortlistService } from 'src/modules/statements/services/aspect-shortlist.service.js';
import { claimLabelAspects, claimLabelsOf } from 'src/modules/statements/util/claim-labels.js';
import { claimFoods } from 'src/modules/statements/util/claim-parts-answer.js';
import {
	type ClaimPartsInputSource,
	claimPartsQuestions,
} from 'src/modules/statements/util/claim-parts-input.js';
import { TermTopicAgent } from 'src/modules/topics/agents/term-topic.agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { runPool } from 'src/shared/util/pool.js';

import { TERM_EVAL_OFF } from './eval-reference.service.js';

import type {
	CaseResult,
	EvalCaseKind,
	EvalClaim,
	EvalMatch,
	EvalPlace,
	EvalPostClaim,
	PostCase,
	PostOutput,
	ReviewCase,
	TermCase,
} from '../interfaces/eval-case.interface.js';
import { readCases, readResults, writeResult, writeRunFile } from '../util/eval-files.js';
import { type EvalSplit, splitOf } from '../util/eval-sample.js';

import { EvalCitiesService, type EvalCity } from './eval-cities.service.js';

// Cases read together, then written: a run stopped by the allowance running out loses at most one
// group, so groups stay small (on gpt-5.4 a group of 10 is ~50-100k tokens of a 1M daily allowance)
const GROUP = 10;
const CONCURRENCY = 5;

/** A claim agent A gave, before its labels: with the foods and number it copied out (none for the reference's own claims) */
type RawClaim = {
	text: string;
	quote: string | null;
	foods?: string[];
	amount?: number | null;
	unit?: StatementUnit | null;
};

/** Whose claims a run labels: agent A's, or the reference's own (the labeller scored alone) */
export type EvalClaimsFrom = 'agent' | 'reference';
export const EVAL_CLAIMS_FROM: EvalClaimsFrom[] = ['agent', 'reference'];

/** A run's reading setup, kept as the run's `run.json` (free models only unless `--paid`, as ever) */
export interface EvalReading {
	/** Agent A's model (the claims, their foods and numbers), over its own tier */
	model?: LlmModelChoice;
	/** The classifier's decision model, over its own (`typesafe-ai/jev-latest`) */
	classifierModel?: DecisionModelId;
	/**
	 * The classifier offered only this many aspects a claim (`aspectShortlist`, by embedding the
	 * claim and the aspects' descriptions), plus their roots: fewer tokens a call
	 */
	aspectShortlist?: number;
	/** `agent` (A) by default */
	claims?: EvalClaimsFrom;
}

/**
 * Runs the current agents on the eval's cases (`npm run eval -- run --label <name>`) the way the
 * pipeline runs them: agent A with the services' own inputs (`reviewClaimsInput`, one review a call;
 * `readPostClaims` (a long post in parts) with the city's topic labels and the own brand), its claims'
 * foods and numbers as it copied them, the claim-labels classifier one claim a call, its source's
 * other claims beside it, as `StatementPartsService` reads them (`claimLabelsOf` on each answer),
 * matching through `decideMatch` against the dev DB's venues (also on the reference's places, to
 * score matching apart from extraction), agent C on the wordings. The models that answered are kept
 * per case, with the tokens per agent and the classifier's dollars. `reading` can put agent A on
 * another model (`model`) and label the reference's own claims instead of A's (`claims:
 * 'reference'`: no agent A, no matching, no pairing; the labeller scored alone). On the roster as
 * production runs it: free models only, failing once the allowance is out (the CLI's `--paid` runs it
 * inside `llmPaid`). Nothing is written to the DB; the reading is kept as the run's `run.json`.
 */
@Injectable()
export class EvalRunService {
	private readonly logger = new Logger(EvalRunService.name);

	constructor(
		private readonly topicService: TopicService,
		private readonly evalCities: EvalCitiesService,
		private readonly reviewClaimsAgent: ReviewClaimsAgent,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly termTopicAgent: TermTopicAgent,
		private readonly venueMatchAgent: VenueMatchAgent,
		private readonly claimLabelsClassifier: ClaimLabelsClassifier,
		private readonly decisionModels: DecisionModelsService,
		private readonly aspectShortlist: AspectShortlistService,
	) {}

	async run(
		label: string,
		opts: {
			kinds: EvalCaseKind[];
			ids?: string[];
			limit?: number;
			force?: boolean;
			reading?: EvalReading;
			/** Only the cases of one side (`splitOf`): `test`, what `compare` judges on, for a paid run */
			split?: EvalSplit;
		},
	): Promise<{ ran: number; failed: number; tokens: number }> {
		const reading = opts.reading ?? {};
		// Keyed and switched on: fails here, not once per claim (the classifier is allowed in production)
		this.decisionModels.model(reading.classifierModel ?? 'typesafe-ai/jev-latest', {
			inProduction: true,
		});
		writeRunFile(label, 'run.json', reading);
		// A case that failed (the call refused or unreadable) is read again on the next run of the label
		const done = new Map([...readResults(label)].filter(([, r]) => !r.error));
		const cases = readCases(opts.kinds).filter(
			c =>
				(opts.force || !done.has(c.id)) &&
				(!opts.ids?.length || opts.ids.includes(c.id)) &&
				(!opts.split || splitOf(c.id) === opts.split) &&
				// Labelling the reference's claims needs a reference; a wording has no claims
				(reading.claims !== 'reference' || c.kind === 'term' || !!c.reference),
		);
		const picked = opts.limit ? cases.slice(0, opts.limit) : cases;
		const index = await this.topicService.index();
		const totals = { ran: 0, failed: 0, tokens: 0 };
		const go = async () => {
			for (const group of _.chunk(picked, GROUP)) {
				const results = await this.runGroup(group, index, reading);
				for (const r of results) {
					writeResult(label, r);
					totals.tokens += r.tokens;
					if (r.error) totals.failed++;
					else totals.ran++;
				}
				this.logger.log(
					`${label}: ${totals.ran + totals.failed} of ${picked.length} cases`,
				);
			}
		};
		await go();
		return totals;
	}

	private async runGroup(
		cases: (ReviewCase | PostCase | TermCase)[],
		index: TopicIndex,
		reading: EvalReading,
	): Promise<CaseResult[]> {
		const fromReference = reading.claims === 'reference';
		const claimsOptions = reading.model ? { model: reading.model } : undefined;
		const results = new Map<string, CaseResult>(
			cases.map(c => [
				c.id,
				{
					caseId: c.id,
					kind: c.kind,
					output: null,
					models: {},
					tokens: 0,
					...(fromReference && c.kind !== 'term' && { claimsFrom: 'reference' as const }),
				},
			]),
		);
		const fail = (id: string, e: Error) => {
			const r = results.get(id)!;
			r.error = e.message;
			this.logger.warn(`${id} failed: ${e.message}`);
		};
		const answered = (
			id: string,
			agent: string,
			res: { model: string; usage?: { totalTokens?: number; cachedInputTokens?: number } },
		) => {
			const r = results.get(id)!;
			r.models[agent] = res.model;
			r.tokens += res.usage?.totalTokens ?? 0;
			r.cachedTokens = (r.cachedTokens ?? 0) + (res.usage?.cachedInputTokens ?? 0);
			r.tokensByAgent ??= {};
			r.tokensByAgent[agent] = (r.tokensByAgent[agent] ?? 0) + (res.usage?.totalTokens ?? 0);
		};
		const paid = (id: string, usd: number) => {
			const r = results.get(id)!;
			r.usd = (r.usd ?? 0) + usd;
		};
		// Each claim's parts by `<case>#<n>`: the classifier's labels, agent A's foods and number
		const parts = new Map<string, Omit<EvalClaim, 'text' | 'quote'>>();

		// Agent A (or, labelling the reference's own claims, none)
		const reviewClaims = new Map<string, RawClaim[]>();
		const reviews = cases.filter((c): c is ReviewCase => c.kind === 'review');
		if (fromReference)
			for (const c of reviews)
				reviewClaims.set(
					c.id,
					c.reference!.claims.map(cl => ({ text: cl.text, quote: cl.quote })),
				);
		// One review a call, as `ReviewService` reads them
		await runPool(
			fromReference ? [] : reviews,
			CONCURRENCY,
			async c => {
				const input = reviewClaimsInput(c.source.venue, c.source);
				const res = await this.reviewClaimsAgent.generate(input, undefined, claimsOptions);
				answered(c.id, 'review-claims', res);
				reviewClaims.set(c.id, res.object.claims);
			},
			(c, e) => fail(c.id, e),
		);

		const posts = cases.filter((c): c is PostCase => c.kind === 'post');
		const postAnswers = new Map<
			string,
			{
				isPromotional: boolean;
				places: Omit<EvalPlace, 'match'>[];
				claims: (RawClaim & Pick<EvalPostClaim, 'subject' | 'place'>)[];
			}
		>();
		if (fromReference)
			for (const c of posts) {
				const ref = c.reference!;
				postAnswers.set(c.id, {
					isPromotional: ref.isPromotional,
					places: ref.places.map(p => ({
						venueName: p.venueName,
						locationHint: p.locationHint,
						city: p.city,
						visited: p.visited,
						isNewOpening: p.isNewOpening,
					})),
					claims: ref.claims.map(cl => ({
						text: cl.text,
						quote: cl.quote,
						subject: cl.subject,
						place: cl.place,
					})),
				});
			}
		await runPool(
			fromReference ? [] : posts,
			CONCURRENCY,
			async c => {
				const res = await readPostClaims(
					this.postClaimsAgent,
					c.source,
					{ cityName: c.source.cityName },
					{ model: reading.model },
				);
				answered(c.id, 'post-claims', res);
				const places = res.object.places.map(p => ({
					venueName: p.venueName,
					locationHint: p.locationHint,
					city: p.city,
					visited: p.visited,
					isNewOpening: p.isNewOpening,
				}));
				postAnswers.set(c.id, {
					isPromotional: res.object.isPromotional,
					places,
					claims: res.object.claims.map(cl => ({
						text: cl.text,
						quote: cl.quote,
						foods: cl.foods,
						amount: cl.amount,
						unit: cl.unit,
						subject: cl.subject,
						// An index outside the list (past it, or -1 for none) is no place, as `replaceForPost` reads it
						place:
							(
								cl.subject === 'place' &&
								cl.place !== null &&
								cl.place >= 0 &&
								cl.place < places.length
							) ?
								cl.place
							:	null,
					})),
				});
			},
			(c, e) => fail(c.id, e),
		);

		// The labeller: the claims grouped by source as `StatementPartsService` groups stored ones
		const sources: ClaimPartsInputSource[] = [];
		for (const c of reviews) {
			const claims = reviewClaims.get(c.id);
			if (claims?.length)
				sources.push({
					kind: 'review',
					venue: c.source.venue,
					claims: claims.map((cl, i) => ({
						id: `${c.id}#${i}`,
						text: cl.text,
						...(cl.quote && { quote: cl.quote }),
					})),
				});
		}
		for (const c of posts) {
			const answer = postAnswers.get(c.id);
			if (!answer) continue;
			const ids = answer.claims.map((cl, i) => ({ cl, id: `${c.id}#${i}` }));
			const groups = _.groupBy(ids, ({ cl }) =>
				cl.place !== null ? `m:${cl.place}` : `s:${cl.subject}`,
			);
			for (const group of Object.values(groups)) {
				const place = group[0].cl.place;
				sources.push({
					kind: 'post',
					venue: place !== null ? answer.places[place].venueName : null,
					claims: group.map(({ cl, id }) => ({
						id,
						text: cl.text,
						...(cl.quote && { quote: cl.quote }),
					})),
				});
			}
		}
		// One claim a call, its source's other claims beside it, as `StatementPartsService` reads them
		const questions = sources.flatMap(claimPartsQuestions);
		// What agent A copied out for a claim (`<case>#<n>`): its foods and its number, what the
		// classifier design stores (none for the reference's own claims)
		const copiedByA = (id: string): RawClaim | undefined => {
			const [caseId, n] = id.split('#');
			return (
				reviewClaims.get(caseId)?.[Number(n)] ?? postAnswers.get(caseId)?.claims[Number(n)]
			);
		};
		{
			// The claim and its context as a decision model's state: sentiment, aspect and kind
			const aspects = claimLabelAspects(index);
			const decideOptions =
				reading.classifierModel ? { model: reading.classifierModel } : undefined;
			const offeredOf =
				reading.aspectShortlist ?
					await this.aspectShortlist.forTexts(aspects, questions, reading.aspectShortlist)
				:	undefined;
			await runPool(
				questions,
				CONCURRENCY,
				async question => {
					const offered = offeredOf?.get(question.id);
					const res = await this.claimLabelsClassifier.decide(
						question.state,
						{ aspects, ...(offered && { offered }) },
						decideOptions,
					);
					const caseId = question.id.split('#')[0];
					answered(caseId, 'claim-labels', res);
					paid(caseId, res.usd);
					const copied = copiedByA(question.id);
					const labels = claimLabelsOf(
						res.answers,
						question.text,
						index,
						copied?.unit !== undefined ?
							{ amount: copied.amount ?? null, unit: copied.unit }
						:	undefined,
					);
					parts.set(question.id, {
						sentiment: labels.sentiment,
						aspect: labels.aspect?.key ?? null,
						// Words copied from the text are no decision, so not the classifier's: agent
						// A's, or unread for the reference's own claims
						foods: copied?.foods ? claimFoods(copied.foods) : null,
						amount: labels.amount,
						unit: labels.unit,
						kind: labels.kind,
						probability: labels.probability,
						...(offered && { offered }),
					});
				},
				(question, e) =>
					this.logger.warn(`Labels of claim ${question.id} failed: ${e.message}`),
			);
		}
		const withParts = (id: string, cl: RawClaim): EvalClaim => ({
			text: cl.text,
			quote: cl.quote,
			...(parts.get(id) ?? {
				sentiment: null,
				aspect: null,
				foods: null,
				amount: null,
				unit: null,
				kind: null,
			}),
		});

		for (const c of reviews) {
			const claims = reviewClaims.get(c.id);
			if (claims)
				results.get(c.id)!.output = {
					claims: claims.map((cl, i) => withParts(`${c.id}#${i}`, cl)),
				};
		}

		// Matching, on the agent's places and on the reference's
		await runPool(
			posts.filter(c => postAnswers.has(c.id)),
			CONCURRENCY,
			async c => {
				const answer = postAnswers.get(c.id)!;
				const claims = answer.claims.map((cl, i) => ({
					...withParts(`${c.id}#${i}`, cl),
					subject: cl.subject,
					place: cl.place,
				}));
				// The reference's own places: nothing to match, only the claims' labels are scored
				if (fromReference) {
					results.get(c.id)!.output = {
						isPromotional: answer.isPromotional,
						places: answer.places.map(p => ({ ...p, match: null })),
						claims,
					};
					return;
				}
				const city = await this.evalCities.get(c.source.cityId);
				const match = (
					place: Omit<EvalPlace, 'match'>,
					said: string[],
				) =>
					this.match(
						c,
						city,
						{
							venueName: place.venueName,
							locationHint: place.locationHint,
							city: place.city,
							said,
						},
						res => answered(c.id, 'venue-match', res),
					);
				const places: EvalPlace[] = [];
				for (const [i, place] of answer.places.entries()) {
					places.push({
						...place,
						match: await match(
							place,
							claims.filter(cl => cl.place === i).map(cl => cl.text),
						),
					});
				}
				const output: PostOutput = { isPromotional: answer.isPromotional, places, claims };
				if (c.reference) {
					output.referencePlaceMatches = [];
					for (const [i, p] of c.reference.places.entries())
						output.referencePlaceMatches.push(
							await match(
								p,
								c.reference.claims.filter(cl => cl.place === i).map(cl => cl.text),
							),
						);
				}
				results.get(c.id)!.output = output;
			},
			(c, e) => fail(c.id, e),
		);

		// Agent C
		const terms = cases.filter((c): c is TermCase => c.kind === 'term');
		// TODO(topic-graph): agent C's term cases are not run. Its answer is one main topic, `exact` and
		// modifiers now, and the references are the old term × topic links: each term case fails with
		// that message until the eval's term part is remade
		for (const c of terms) fail(c.id, new Error(TERM_EVAL_OFF));

		for (const r of results.values()) {
			r.tokens = Math.round(r.tokens);
			if (!r.output && !r.error) r.error = 'no output';
		}
		return [...results.values()];
	}

	/**
	 * Each claim's aspect shortlist (`aspectShortlist`): the aspects' descriptions and the claims'
	 * texts embedded at the claims' 1,024 values, a thousand a request (paid to OpenAI by the token,
	 * cents a run)
	 */
	private async match(
		c: PostCase,
		city: EvalCity,
		place: Omit<MatchInput, 'author' | 'taggedLocation'>,
		answered: (res: { model: string; usage?: { totalTokens?: number } }) => void,
	): Promise<EvalMatch> {
		const decision = await decideMatch(
			{ ...place, author: c.source.author, taggedLocation: c.source.locationName },
			city.venues,
			city.names,
			city.words,
			async message => {
				const res = await this.venueMatchAgent.generate(message);
				answered(res);
				return res.object;
			},
		);
		const venue =
			decision.venueId ? city.venues.find(v => v.id === decision.venueId) : undefined;
		const brand =
			decision.brandId ? city.venues.find(v => v.brandId === decision.brandId) : undefined;
		return {
			method: decision.method,
			brandId: decision.brandId,
			brandName: brand?.brandName ?? null,
			venueId: decision.venueId,
			venueName: venue?.name ?? null,
		};
	}
}
