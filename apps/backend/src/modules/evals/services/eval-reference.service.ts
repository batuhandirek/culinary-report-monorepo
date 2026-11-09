import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';
import { createHash } from 'node:crypto';

import type { LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';
import { VenueMatchAgent } from 'src/modules/pipeline/match-mentions/agents/venue-match.agent.js';
import { PostClaimsAgent } from 'src/modules/pipeline/read-posts/agents/post-claims.agent.js';
import { postClaimsPrompt } from 'src/modules/pipeline/read-posts/util/post-claims-input.js';
import { ReviewClaimsAgent } from 'src/modules/pipeline/read-reviews/agents/review-claims.agent.js';
import { reviewClaimsInput } from 'src/modules/pipeline/read-reviews/util/review-claims-input.js';
import { claimLabelAspects, claimLabelsRules } from 'src/modules/statements/util/claim-labels.js';
import { TermTopicAgent } from 'src/modules/topics/agents/term-topic.agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { termAnswerLinks, termTopicInputTopics } from 'src/modules/topics/util/term-topic-input.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { termKey } from 'src/modules/venues/util/dishes.js';
import {
	nameSimilarity,
	normalizeVenueName,
	venueAliases,
} from 'src/modules/venues/util/venue-names.js';
import { runPool } from 'src/shared/util/pool.js';

import { AspectReferenceAgent } from '../agents/aspect-reference.agent.js';
import { MatchReferenceAgent } from '../agents/match-reference.agent.js';
import { PostReferenceAgent } from '../agents/post-reference.agent.js';
import { PromotionalReferenceAgent } from '../agents/promotional-reference.agent.js';
import { ReviewReferenceAgent } from '../agents/review-reference.agent.js';
import { TermReferenceAgent } from '../agents/term-reference.agent.js';
import {
	MATCH_REFERENCE_BRANCHES,
	MATCH_REFERENCE_CANDIDATES,
	REFERENCE_CONCURRENCY,
	REFERENCE_MAX_OUTPUT_TOKENS,
	REFERENCE_MODEL,
	REFERENCE_TIMEOUT_MS,
} from '../constants/eval.constant.js';
import type {
	EvalCaseKind,
	EvalMatch,
	EvalUsage,
	PostCase,
	ReferenceClaim,
	ReviewCase,
	TermCase,
} from '../interfaces/eval-case.interface.js';
import { addUsage, costUsd, NO_USAGE, usageOf } from '../util/eval-cost.js';
import { readCases, writeCase, writeResult } from '../util/eval-files.js';

import { EvalCitiesService } from './eval-cities.service.js';

// Wordings a reference call decides: fewer than agent C's 100, as Opus also weighs alternatives
const TERMS_PER_REFERENCE_CALL = 50;
// What the match reference reads of a post: enough to place its venues
const MATCH_TEXT_CHARS = 3000;
// Rejected answers in a row (another model answered: the credit is out) before the run stops
const MAX_REJECTED_IN_A_ROW = 3;

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/** Raised when the reference model is not the one that answered: nothing is written */
class WrongModelError extends Error {}

export interface ReferenceRunResult {
	written: number;
	failed: number;
	rejected: number;
	usage: EvalUsage;
	usd: number;
	/** Dollars per case, for the pilot's estimate */
	perCase: { id: string; usd: number; inputTokens: number; outputTokens: number }[];
}

/**
 * The eval's reference answers (`npm run eval -- reference`): Opus does each case with the
 * pipeline agents' own instructions as its spec (`instructionsFor`), so the reference reads the
 * source by the rules the agents are told. An answer any other model gave (the roster's fallback)
 * is discarded. Each case is written as soon as its reference is in, so a stopped run loses nothing.
 */
@Injectable()
export class EvalReferenceService {
	private readonly logger = new Logger(EvalReferenceService.name);

	constructor(
		private readonly topicService: TopicService,
		private readonly evalCities: EvalCitiesService,
		private readonly reviewClaimsAgent: ReviewClaimsAgent,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly termTopicAgent: TermTopicAgent,
		private readonly venueMatchAgent: VenueMatchAgent,
		private readonly reviewReferenceAgent: ReviewReferenceAgent,
		private readonly postReferenceAgent: PostReferenceAgent,
		private readonly matchReferenceAgent: MatchReferenceAgent,
		private readonly termReferenceAgent: TermReferenceAgent,
		private readonly aspectReferenceAgent: AspectReferenceAgent,
		private readonly promotionalReferenceAgent: PromotionalReferenceAgent,
	) {}

	/** The model a reference run reads with, and the run a second reader writes to */
	private model: LlmModelId = REFERENCE_MODEL;
	private asRun: string | undefined;

	async run(opts: {
		kinds: EvalCaseKind[];
		ids?: string[];
		limit?: number;
		force?: boolean;
		maxUsd?: number;
		/**
		 * A second reader: the same task on another model (`openai/gpt-5.4`), written as the run
		 * `asRun` (scored against the references, so its misses are where the two disagree), never
		 * into the cases. Reviews and posts only.
		 */
		model?: LlmModelId;
		asRun?: string;
	}): Promise<ReferenceRunResult> {
		this.model = opts.model ?? REFERENCE_MODEL;
		this.asRun = opts.asRun;
		if (this.asRun && opts.kinds.includes('term'))
			throw new Error('a second reader reads reviews and posts: --kind review,post');
		const index = await this.topicService.index();
		const cases = readCases(opts.kinds).filter(
			c =>
				(opts.force || this.asRun || !c.reference) &&
				(!opts.ids?.length || opts.ids.includes(c.id)),
		);
		const picked = opts.limit ? cases.slice(0, opts.limit) : cases;
		const result: ReferenceRunResult = {
			written: 0,
			failed: 0,
			rejected: 0,
			usage: NO_USAGE,
			usd: 0,
			perCase: [],
		};
		let rejectedInARow = 0;
		const overBudget = () => opts.maxUsd !== undefined && result.usd >= opts.maxUsd;
		const spent = (id: string, usage: EvalUsage) => {
			const usd = costUsd(this.model, usage);
			result.usage = addUsage(result.usage, usage);
			result.usd += usd;
			result.perCase.push({
				id,
				usd,
				inputTokens: usage.inputTokens,
				outputTokens: usage.outputTokens,
			});
		};
		const guard = async (id: string, fn: () => Promise<number>) => {
			if (overBudget() || rejectedInARow >= MAX_REJECTED_IN_A_ROW) return;
			try {
				// Awaited first: `+= await` would read the total before the call and lose the others in flight
				const written = await fn();
				result.written += written;
				rejectedInARow = 0;
			} catch (e) {
				if (e instanceof WrongModelError) {
					result.rejected++;
					rejectedInARow++;
					this.logger.error(`${id}: ${e.message}`);
					return;
				}
				throw e;
			}
		};

		const reviews = picked.filter((c): c is ReviewCase => c.kind === 'review');
		const posts = picked.filter((c): c is PostCase => c.kind === 'post');
		const terms = picked.filter((c): c is TermCase => c.kind === 'term');
		const onError = (id: string, e: Error) => {
			result.failed++;
			this.logger.warn(`${id} failed: ${e.message}`);
		};

		await runPool(
			reviews,
			REFERENCE_CONCURRENCY,
			c => guard(c.id, () => this.reviewReference(c, index, spent)),
			(c, e) => onError(c.id, e),
		);
		await runPool(
			posts,
			REFERENCE_CONCURRENCY,
			c => guard(c.id, () => this.postReference(c, index, spent)),
			(c, e) => onError(c.id, e),
		);
		await runPool(
			_.chunk(terms, TERMS_PER_REFERENCE_CALL),
			REFERENCE_CONCURRENCY,
			batch => guard(batch[0].id, () => this.termReference(batch, index, spent)),
			(batch, e) => onError(batch[0].id, e),
		);
		if (overBudget())
			this.logger.warn(`Stopped at the budget: $${result.usd.toFixed(2)} of $${opts.maxUsd}`);
		if (rejectedInARow >= MAX_REJECTED_IN_A_ROW)
			this.logger.error(
				`Stopped: ${this.model} did not answer ${MAX_REJECTED_IN_A_ROW} times in a row (credit or key?)`,
			);
		return result;
	}

	/** The options every reference call runs with: Opus first, room to think and answer */
	private callOptions() {
		return {
			model: this.model,
			modelSettings: { maxOutputTokens: REFERENCE_MAX_OUTPUT_TOKENS },
			abortSignal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS),
		} as const;
	}

	private checkModel(model: string) {
		if (model !== this.model)
			throw new WrongModelError(`answered by ${model}, not ${this.model}: discarded`);
	}

	/** A reference written into its case, or, for a second reader, as that run's result */
	private keep(
		c: ReviewCase | PostCase,
		reference: NonNullable<(ReviewCase | PostCase)['reference']>,
	) {
		if (!this.asRun) {
			c.reference = reference as never;
			writeCase(c);
			return;
		}
		writeResult(this.asRun, {
			caseId: c.id,
			kind: c.kind,
			output: _.omit(reference, ['model', 'specHash', 'at', 'usage', 'notes']) as never,
			models: { reference: reference.model },
			tokens: reference.usage.inputTokens + reference.usage.outputTokens,
		});
	}

	/**
	 * After the aspect table changed: every review's and post's reference claims get their aspect
	 * (and the aspects also allowed) again from Opus by the table now, one source a call, nothing
	 * else of them touched; each change is logged in the reference's `revisions` and its `specHash`
	 * moves to the rules now. `maxUsd` stops before the next call once spent.
	 */
	async relabelAspects(opts: { ids?: string[]; maxUsd?: number }) {
		const index = await this.topicService.index();
		const specB = this.specB(index);
		const cases = readCases(['review', 'post']).filter(
			(c): c is ReviewCase | PostCase =>
				!!c.reference && (!opts.ids?.length || opts.ids.includes(c.id)),
		);
		const result = { cases: 0, changed: 0, failed: 0, usd: 0, usage: NO_USAGE };
		await runPool(
			cases,
			REFERENCE_CONCURRENCY,
			async c => {
				if (opts.maxUsd !== undefined && result.usd >= opts.maxUsd) return;
				const ref = c.reference!;
				const places =
					c.kind === 'post' ? (ref as PostCase['reference'] & object).places : [];
				const res = await this.aspectReferenceAgent.generate(
					JSON.stringify({
						source:
							c.kind === 'review' ?
								'a Google review'
							:	`a ${c.source.platform} post or article`,
						place: c.kind === 'review' ? c.source.venue : null,
						claims: ref.claims.map((cl, n) => ({
							n,
							text: cl.text,
							...(cl.quote && { quote: cl.quote }),
							...('place' in cl &&
								cl.place !== null &&
								places[cl.place as number] && {
									about: places[cl.place as number].venueName,
								}),
						})),
					}),
					{ specB },
					this.callOptions(),
				);
				const usage = usageOf(res);
				result.usage = addUsage(result.usage, usage);
				result.usd += costUsd(REFERENCE_MODEL, usage);
				this.checkModel(res.model);
				let changed = 0;
				for (const answer of res.object.claims) {
					const cl = ref.claims[answer.n];
					if (!cl) continue;
					const aspect =
						answer.aspect === 'none' ?
							null
						:	(index.aspect(answer.aspect)?.key ?? null);
					const also = _.uniq(
						answer.alsoAcceptable
							.map(a => (a === 'none' ? 'none' : index.aspect(a)?.key))
							.filter((a): a is string => !!a && a !== aspect),
					);
					if (cl.aspect !== aspect || !_.isEqual(cl.alsoAcceptable.aspects, also))
						changed++;
					cl.aspect = aspect;
					cl.alsoAcceptable.aspects = also;
				}
				ref.specHash =
					c.kind === 'review' ?
						sha1(this.reviewClaimsAgent.rulesFor() + specB)
					:	sha1(this.postClaimsAgent.rulesFor({ cityName: c.source.cityName }) + specB);
				ref.revisions = [
					...(ref.revisions ?? []),
					{
						at: new Date().toISOString(),
						by: 'aspect-relabel',
						note: `aspects answered again by the table of ${new Date().toISOString().slice(0, 10)}: ${changed} of ${ref.claims.length} claims changed`,
					},
				];
				writeCase(c);
				result.cases++;
				result.changed += changed;
			},
			(c, e) => {
				result.failed++;
				this.logger.warn(`${c.id}: ${e.message}`);
			},
		);
		return result;
	}

	/**
	 * After "promotional" was defined (the user, 2026-11-02): every post reference's `isPromotional`
	 * answered again by Opus by step A's rules now, one post a call, nothing else touched; each change
	 * is logged in `revisions`. `maxUsd` stops before the next call once spent.
	 */
	async relabelPromotional(opts: { ids?: string[]; maxUsd?: number }) {
		const index = await this.topicService.index();
		const specB = this.specB(index);
		const cases = readCases(['post']).filter(
			(c): c is PostCase => !!c.reference && (!opts.ids?.length || opts.ids.includes(c.id)),
		);
		const result = { cases: 0, changed: 0, failed: 0, usd: 0 };
		await runPool(
			cases,
			REFERENCE_CONCURRENCY,
			async c => {
				if (opts.maxUsd !== undefined && result.usd >= opts.maxUsd) return;
				const ref = c.reference!;
				const specA = this.postClaimsAgent.rulesFor({ cityName: c.source.cityName });
				const res = await this.promotionalReferenceAgent.generate(
					postClaimsPrompt(c.source),
					{ specA },
					this.callOptions(),
				);
				result.usd += costUsd(REFERENCE_MODEL, usageOf(res));
				this.checkModel(res.model);
				const before = ref.isPromotional;
				ref.isPromotional = res.object.isPromotional;
				ref.specHash = sha1(specA + specB);
				if (before !== ref.isPromotional) result.changed++;
				ref.revisions = [
					...(ref.revisions ?? []),
					{
						at: new Date().toISOString(),
						by: 'promotional-relabel',
						note: `promotional by the rule of 2026-11-02: ${before} → ${ref.isPromotional} (${res.object.reason})`,
					},
				];
				writeCase(c);
				result.cases++;
			},
			(c, e) => {
				result.failed++;
				this.logger.warn(`${c.id}: ${e.message}`);
			},
		);
		return result;
	}

	/** The labels' rules (sentiment, aspect, kind): what the claim-labels classifier is asked */
	private specB(index: TopicIndex) {
		return claimLabelsRules(claimLabelAspects(index));
	}

	private async reviewReference(
		c: ReviewCase,
		index: TopicIndex,
		spent: (id: string, u: EvalUsage) => void,
	) {
		const specA = this.reviewClaimsAgent.rulesFor();
		const specB = this.specB(index);
		const res = await this.reviewReferenceAgent.generate(
			reviewClaimsInput(c.source.venue, c.source),
			{ specA, specB },
			this.callOptions(),
		);
		const usage = usageOf(res);
		spent(c.id, usage);
		this.checkModel(res.model);
		this.keep(c, {
			model: res.model,
			specHash: sha1(specA + specB),
			at: new Date().toISOString(),
			usage,
			notes: res.object.notes,
			claims: res.object.claims.map(claim => normalizeClaim(claim, index)),
		});
		return 1;
	}

	private async postReference(
		c: PostCase,
		index: TopicIndex,
		spent: (id: string, u: EvalUsage) => void,
	) {
		const specA = this.postClaimsAgent.rulesFor({
			cityName: c.source.cityName,
		});
		const specB = this.specB(index);
		const res = await this.postReferenceAgent.generate(
			postClaimsPrompt(c.source),
			{ specA, specB },
			this.callOptions(),
		);
		let usage = usageOf(res);
		this.checkModel(res.model);
		const answer = res.object;
		const claims = answer.claims.map(claim => ({
			...normalizeClaim(claim, index),
			subject: claim.subject,
			place:
				(
					claim.subject === 'place' &&
					claim.place !== null &&
					claim.place < answer.places.length
				) ?
					claim.place
				:	null,
		}));

		// Which venue each place is, over a wider net of the city's brands than the matcher's five
		const city = await this.evalCities.get(c.source.cityId);
		const candidatesOf = (name: string) => {
			const key = normalizeVenueName(name, city.words);
			const best = _.mapValues(
				_.groupBy(city.venues, v => v.brandId),
				venues =>
					Math.max(
						...venues.map(v => Math.max(...v.aliases.map(a => nameSimilarity(key, a)))),
					),
			);
			const stored = new Set(
				c.stored.places.map(p => p.match?.brandId).filter(Boolean) as string[],
			);
			const own =
				c.source.ownBrand ? normalizeVenueName(c.source.ownBrand, city.words) : null;
			const ranked = _.orderBy(Object.keys(best), [id => best[id]], ['desc']);
			const ids = _.uniq([
				...ranked.slice(0, MATCH_REFERENCE_CANDIDATES),
				...[...stored].filter(id => best[id] !== undefined),
				...(own ?
					ranked.filter(id =>
						city.venues.some(
							v =>
								v.brandId === id &&
								venueAliases(v.brandName, city.words).includes(own),
						),
					)
				:	[]),
			]);
			return ids.map(brandId => {
				const branches = _.orderBy(
					city.venues.filter(v => v.brandId === brandId),
					[v => v.reviewsCount ?? 0],
					['desc'],
				);
				return {
					brandId,
					name: branches[0].brandName,
					category: branches[0].category,
					branchCount: branches.length,
					branches: branches.slice(0, MATCH_REFERENCE_BRANCHES).map(v => ({
						venueId: v.id,
						name: v.name,
						district: v.district,
						street: v.street,
					})),
				};
			});
		};
		const places = answer.places.map((p, i) => ({
			index: i,
			...p,
			candidates: candidatesOf(p.venueName),
		}));
		let matches: Map<
			number,
			{ brandId: string | null; venueId: string | null; note: string | null }
		> = new Map();
		if (places.length) {
			const text =
				c.source.platform === 'blog' ?
					c.source.text
				:	[c.source.text, c.source.subtitles].filter(Boolean).join('\n\n');
			const matchRes = await this.matchReferenceAgent.generate(
				JSON.stringify({
					post: {
						platform: c.source.platform,
						author: c.source.author,
						ownBrand: c.source.ownBrand,
						taggedLocation: c.source.locationName,
						text: (text ?? '').slice(0, MATCH_TEXT_CHARS),
					},
					places: places.map(p => ({
						index: p.index,
						venueName: p.venueName,
						locationHint: p.locationHint,
						city: p.city,
						said: claims
							.filter(cl => cl.place === p.index)
							.map(cl => cl.text)
							.slice(0, 5),
						candidates: p.candidates,
					})),
				}),
				{ spec: this.venueMatchAgent.rulesFor() },
				this.callOptions(),
			);
			usage = addUsage(usage, usageOf(matchRes));
			this.checkModel(matchRes.model);
			matches = new Map(matchRes.object.places.map(m => [m.index, m]));
		}
		spent(c.id, usage);
		const byBrand = _.groupBy(city.venues, v => v.brandId);
		this.keep(c, {
			model: res.model,
			specHash: sha1(this.postClaimsAgent.rulesFor({ cityName: c.source.cityName }) + specB),
			at: new Date().toISOString(),
			usage,
			notes: answer.notes,
			isPromotional: answer.isPromotional,
			places: places.map(p => {
				const m = matches.get(p.index);
				const branches = m?.brandId ? (byBrand[m.brandId] ?? []) : [];
				// A brand with one branch is that branch; a branch must be the brand's
				const venue =
					branches.length === 1 ? branches[0]
					: m?.venueId ? branches.find(v => v.id === m.venueId)
					: undefined;
				const match: EvalMatch & { note: string | null } = {
					method: null,
					brandId: branches.length ? m!.brandId : null,
					brandName: branches[0]?.brandName ?? null,
					venueId: venue?.id ?? null,
					venueName: venue?.name ?? null,
					note: m?.note ?? null,
				};
				return {
					venueName: p.venueName,
					locationHint: p.locationHint,
					city: p.city,
					visited: p.visited,
					isNewOpening: p.isNewOpening,
					match,
				};
			}),
			claims,
			venuesAtMatch: city.venues.length,
		});
		return 1;
	}

	private async termReference(
		batch: TermCase[],
		index: TopicIndex,
		spent: (id: string, u: EvalUsage) => void,
	) {
		const spec = this.termTopicAgent.rulesFor();
		const res = await this.termReferenceAgent.generate(
			JSON.stringify({
				topics: termTopicInputTopics(index),
				terms: batch.map(c => ({ id: String(c.source.termId), name: c.source.name })),
			}),
			{ spec },
			this.callOptions(),
		);
		const usage = usageOf(res);
		this.checkModel(res.model);
		const answers = new Map(res.object.terms.map(a => [a.id, a]));
		let written = 0;
		// The call's usage is spread over its wordings
		const share: EvalUsage = _.mapValues(usage, v => Math.round(v / batch.length)) as EvalUsage;
		for (const c of batch) {
			const answer = answers.get(String(c.source.termId));
			if (!answer) continue;
			const { keys, relations, suggestion } = termAnswerLinks(answer, index);
			c.reference = {
				model: res.model,
				specHash: sha1(spec),
				at: new Date().toISOString(),
				usage: share,
				notes: null,
				topics: keys.map(key => ({ key, relation: relations.get(key)! })),
				alsoAcceptable: _.uniq(
					answer.alsoAcceptable
						.map(k => (index.get(k) ? k : index.exact(k)))
						.filter((k): k is string => !!k && !keys.includes(k)),
				),
				suggestion,
			};
			writeCase(c);
			written++;
		}
		spent(batch[0].id, usage);
		return written;
	}
}

/** A reference claim as stored: aspects the table has ("none" for no aspect), foods once per wording */
const normalizeClaim = (
	claim: Omit<ReferenceClaim, 'aspect'> & { aspect: string | null },
	index: Pick<TopicIndex, 'aspect'>,
): ReferenceClaim => ({
	text: claim.text,
	quote: claim.quote,
	sentiment: claim.sentiment,
	aspect: index.aspect(claim.aspect)?.key ?? null,
	foods: _.uniqBy(
		claim.foods.filter(f => termKey(f)),
		termKey,
	),
	amount: claim.amount,
	unit: claim.unit,
	kind: claim.kind,
	optional: claim.optional,
	alsoAcceptable: {
		sentiments: _.uniq(claim.alsoAcceptable.sentiments),
		aspects: _.uniq(
			claim.alsoAcceptable.aspects
				.map(a => (a === 'none' ? 'none' : index.aspect(a)?.key))
				.filter((a): a is string => !!a),
		),
		kinds: _.uniq(claim.alsoAcceptable.kinds),
	},
});
