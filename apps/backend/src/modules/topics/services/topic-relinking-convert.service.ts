import { createHash } from 'node:crypto';

import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';
import { EmbeddingsService } from 'src/modules/llm/services/embeddings.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import { answerUsd } from 'src/modules/llm/util/llm-cost.js';
import { runPool } from 'src/shared/util/pool.js';

import { TermTopicAgent } from '../agents/term-topic.agent.js';
import { TOPIC_EMBEDDING_DIMENSIONS } from '../constants/topic-edge.constant.js';
import {
	DECIDED_AT_SQL,
	TOPIC_RELINKING_CONCURRENCY,
	TOPIC_RELINKING_MODEL,
	TOPIC_RELINKING_SAVE_EVERY,
	topicRelinkingFile,
} from '../constants/topic-relinking.constant.js';
import type { TopicKindEnum } from '../entities/topic.entity.js';
import type {
	TopicRelinkingEntry,
	TopicRelinkingFile,
} from '../interfaces/topic-relinking.interface.js';
import {
	NO_TOPIC,
	termDecisionOf,
	termTopicInputTopics,
	termTopicMessage,
	type TermTopicHint,
} from '../util/term-topic-input.js';
import {
	readTopicRelinking,
	relinkingEntry,
	writeTopicRelinking,
} from '../util/topic-relinking-file.js';
import { topicEmbeddingText } from '../util/topic-shortlist.js';
import { TopicIndex } from '../util/topics.js';

const EMBED_CHUNK = 500;

const md5Hex = (value: string) => createHash('md5').update(value).digest('hex');

/**
 * A wording of the old model: a decided one with the links agent C is told as a hint, or one never
 * decided (`decided_at` null, no links), the `terms` backlog's work
 */
interface OldTerm {
	key: string;
	name: string;
	decided_at: string | null;
	links: (TermTopicHint & { key: string })[];
	uses: number;
}

/** The old schema's topics as the graph will hold them after the migration, and the fixed part of every call */
interface OldTopics {
	rows: { id: string; key: string; label: string; kind: TopicKindEnum; hint: string | null }[];
	index: TopicIndex;
}

/** One model's answer to one wording in `sample` */
export interface SampleAnswer {
	model: string;
	entry: TopicRelinkingEntry | null;
	error?: string;
	usd: number;
	tokens: number;
}

export interface ConvertResult {
	/** Wordings the old model decided with links that one `same` link doesn't settle, then the ones never decided */
	wordings: number;
	/** Of `wordings`, the ones never decided */
	undecided: number;
	/** Settled without a call: the wording is a topic's name as a whole */
	matched: number;
	/** Kept from a file an earlier run wrote (same wording, same decision time) */
	kept: number;
	asked: number;
	/** Undecided wordings the agent called none, asked again on `recheckNone`, and how many of those found a topic */
	rechecked: number;
	recheckFound: number;
	unanswered: number;
	usd: number;
	tokens: number;
	file: string;
}

/**
 * The one-off conversion of the old term × topic links into the graph's decisions, run by hand on
 * a clone of production **before** the topic-graph migration (`topic-relinking.cli.ts`, paid):
 * every decided wording one `same` link doesn't settle is asked of agent C under its new contract,
 * with its old links as a hint, then every wording never decided (production's `terms` backlog
 * stops on the allowance most nights), as the backlog asks it, and the answers are written to
 * `tmp/topic-relinking/terms.json`,
 * which every database applies at boot (`TopicRelinkingImportService`). Reads the **old** schema
 * (`term_topics`, `topics.parent_id`) with plain SQL only: the entities are the new shape. Topics
 * are embedded in memory for the run, since the old schema has no column for the vectors.
 */
@Injectable()
export class TopicRelinkingConvertService {
	private readonly logger = new Logger(TopicRelinkingConvertService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly termTopicAgent: TermTopicAgent,
		private readonly embeddingsService: EmbeddingsService,
	) {}

	/**
	 * Converts up to `limit` wordings (the decided ones first, then the undecided, each the most used
	 * first; all by default) on `model`, stopping before a call once `maxUsd` is spent.
	 * `decidedOnly` leaves the undecided ones to the backlog. `recheckNone` asks every "none" the
	 * agent gave a never-decided wording again on a stronger model (Haiku said none too often on a
	 * sample against Opus, and a none is never asked again), its answer kept with `recheckedOn`.
	 * An earlier run's file is continued: its
	 * entries for wordings still decided at the same moment (or still undecided) are kept and not
	 * asked again (`fresh` asks all).
	 */
	async convert(
		opts: {
			model?: LlmModelId;
			limit?: number;
			maxUsd?: number;
			fresh?: boolean;
			decidedOnly?: boolean;
			/** A second model each "none" the agent gave a never-decided wording is asked again on */
			recheckNone?: LlmModelId;
			/** Calls in flight (`TOPIC_RELINKING_CONCURRENCY` by default) */
			concurrency?: number;
		} = {},
	): Promise<ConvertResult> {
		const model = opts.model ?? TOPIC_RELINKING_MODEL;
		const { rows: topicRows, index } = await this.oldTopics();
		const decided = await this.decidedTerms();
		const undecided = opts.decidedOnly ? [] : await this.undecidedTerms();
		const terms = [...decided, ...undecided].slice(0, opts.limit ?? Infinity);
		const earlier = opts.fresh ? null : readTopicRelinking();
		const out: TopicRelinkingFile = {
			generatedAt: new Date().toISOString(),
			model,
			usd: earlier?.usd ?? 0,
			tokens: earlier?.tokens ?? 0,
			unanswered: [],
			terms: {},
		};
		const result: ConvertResult = {
			wordings: terms.length,
			undecided: terms.filter(t => t.decided_at === null).length,
			matched: 0,
			kept: 0,
			asked: 0,
			rechecked: 0,
			recheckFound: 0,
			unanswered: 0,
			usd: 0,
			tokens: 0,
			file: '',
		};
		const toAsk: OldTerm[] = [];
		for (const term of terms) {
			const before = earlier?.terms[term.key];
			if (before && before.decidedAt === term.decided_at) {
				out.terms[term.key] = before;
				result.kept++;
				continue;
			}
			// A wording that is a topic's key or label as a whole needs no model
			const same = index.exact(term.name) ?? index.exact(term.key);
			if (same) {
				out.terms[term.key] = relinkingEntry(
					term.decided_at,
					{ ...NO_TOPIC, topicKey: same, exact: true },
					'match',
				);
				result.matched++;
				continue;
			}
			toAsk.push(term);
		}
		this.logger.log(
			`${terms.length} wordings (${result.undecided} never decided): ${result.kept} kept from the file, ` +
				`${result.matched} are a topic's name, ${toAsk.length} to ask on ${model}`,
		);
		const vectors = await this.embed(topicRows.map(t => topicEmbeddingText(t)));
		const topicVectors = vectors ? new Map(topicRows.map((t, i) => [t.key, vectors[i]])) : null;
		const wordingVectors = topicVectors ? await this.embed(toAsk.map(t => t.name)) : null;
		if (!topicVectors || !wordingVectors)
			this.logger.warn(
				'No embeddings: every topic is offered on every call (several times the tokens)',
			);
		const fixed = termTopicInputTopics(index);
		let sinceSave = 0;
		const save = () => {
			out.usd = (earlier?.usd ?? 0) + result.usd;
			out.tokens = (earlier?.tokens ?? 0) + result.tokens;
			writeTopicRelinking(out);
		};
		await withLlmCallContext({ purpose: 'topic-relinking' }, () =>
			runPool(
				toAsk.map((term, i) => ({ term, vector: wordingVectors?.[i] })),
				opts.concurrency ?? TOPIC_RELINKING_CONCURRENCY,
				async ({ term, vector }) => {
					if (opts.maxUsd !== undefined && result.usd >= opts.maxUsd) {
						out.unanswered.push(term.key);
						return;
					}
					const res = await this.ask(term, index, fixed, vector, topicVectors, model);
					result.asked++;
					result.tokens += res.usage?.totalTokens ?? 0;
					result.usd += answerUsd(res);
					out.terms[term.key] = relinkingEntry(
						term.decided_at,
						termDecisionOf(res.object, index),
					);
					if (++sinceSave >= TOPIC_RELINKING_SAVE_EVERY) {
						sinceSave = 0;
						save();
						this.logger.log(
							`${result.asked} of ${toAsk.length} asked, $${result.usd.toFixed(2)} so far`,
						);
					}
				},
				({ term }, e) => {
					out.unanswered.push(term.key);
					this.logger.warn(`"${term.name}" not answered: ${e.message}`);
				},
			),
		).finally(save);
		if (opts.recheckNone)
			await this.recheckNone(terms, out, result, opts.recheckNone, opts.maxUsd, {
				index,
				fixed,
				topicVectors,
				save,
				concurrency: opts.concurrency ?? TOPIC_RELINKING_CONCURRENCY,
			});
		result.unanswered = out.unanswered.length;
		result.file = topicRelinkingFile();
		return result;
	}

	/** Asks the agent's "none" answers for never-decided wordings again on `model` (see `convert`) */
	private async recheckNone(
		terms: OldTerm[],
		out: TopicRelinkingFile,
		result: ConvertResult,
		model: LlmModelId,
		maxUsd: number | undefined,
		ctx: {
			index: TopicIndex;
			fixed: ReturnType<typeof termTopicInputTopics>;
			topicVectors: Map<string, number[]> | null;
			save: () => void;
			concurrency: number;
		},
	) {
		const toRecheck = terms.filter(t => {
			const e = out.terms[t.key];
			return e?.decidedAt === null && e.decidedBy === 'ai' && e.none && !e.recheckedOn;
		});
		this.logger.log(`${toRecheck.length} "none" answers to ask again on ${model}`);
		const vectors = ctx.topicVectors ? await this.embed(toRecheck.map(t => t.name)) : null;
		let sinceSave = 0;
		await withLlmCallContext({ purpose: 'topic-relinking' }, () =>
			runPool(
				toRecheck.map((term, i) => ({ term, vector: vectors?.[i] })),
				ctx.concurrency,
				async ({ term, vector }) => {
					if (maxUsd !== undefined && result.usd >= maxUsd) return;
					const res = await this.ask(
						term,
						ctx.index,
						ctx.fixed,
						vector,
						ctx.topicVectors,
						model,
					);
					result.rechecked++;
					result.tokens += res.usage?.totalTokens ?? 0;
					result.usd += answerUsd(res);
					const entry = relinkingEntry(null, termDecisionOf(res.object, ctx.index));
					if (!entry.none) result.recheckFound++;
					out.terms[term.key] = { ...entry, recheckedOn: res.model ?? model };
					if (++sinceSave >= TOPIC_RELINKING_SAVE_EVERY) {
						sinceSave = 0;
						ctx.save();
						this.logger.log(
							`${result.rechecked} of ${toRecheck.length} asked again, $${result.usd.toFixed(2)} so far`,
						);
					}
				},
				// A failed second opinion keeps the first answer
				({ term }, e) => this.logger.warn(`"${term.name}" not asked again: ${e.message}`),
			),
		).finally(ctx.save);
	}

	/**
	 * Asks each of `models` about the same `size` undecided wordings no name settles (half the most
	 * used, half spread over the rest by `md5(key)`), writes nothing to the database or the file:
	 * how a model answers the backlog's work, read against a stronger one before paying for all.
	 */
	async sample(opts: {
		size: number;
		models: LlmModelId[];
	}): Promise<{ key: string; name: string; uses: number; answers: SampleAnswer[] }[]> {
		const { rows: topicRows, index } = await this.oldTopics();
		const open = (await this.undecidedTerms()).filter(
			t => !(index.exact(t.name) ?? index.exact(t.key)),
		);
		const top = open.slice(0, Math.ceil(opts.size / 2));
		const rest = _.sortBy(open.slice(top.length), t => md5Hex(t.key)).slice(
			0,
			opts.size - top.length,
		);
		const picked = [...top, ...rest];
		const vectors = await this.embed(topicRows.map(t => topicEmbeddingText(t)));
		const topicVectors = vectors ? new Map(topicRows.map((t, i) => [t.key, vectors[i]])) : null;
		const wordingVectors = topicVectors ? await this.embed(picked.map(t => t.name)) : null;
		const fixed = termTopicInputTopics(index);
		const out = picked.map(t => ({
			key: t.key,
			name: t.name,
			uses: t.uses,
			answers: [] as SampleAnswer[],
		}));
		await withLlmCallContext({ purpose: 'topic-relinking-sample' }, async () => {
			for (const model of opts.models)
				await runPool(
					picked.map((term, i) => ({ term, i })),
					TOPIC_RELINKING_CONCURRENCY,
					async ({ term, i }) => {
						try {
							const res = await this.ask(
								term,
								index,
								fixed,
								wordingVectors?.[i],
								topicVectors,
								model,
							);
							out[i].answers.push({
								model: res.model ?? model,
								entry: relinkingEntry(null, termDecisionOf(res.object, index)),
								usd: answerUsd(res),
								tokens: res.usage?.totalTokens ?? 0,
							});
						} catch (e) {
							out[i].answers.push({
								model,
								entry: null,
								error: (e as Error).message,
								usd: 0,
								tokens: 0,
							});
						}
					},
				);
		});
		return out;
	}

	/** One wording to agent C, with its old links as a hint when it had any */
	private ask(
		term: OldTerm,
		index: TopicIndex,
		fixed: ReturnType<typeof termTopicInputTopics>,
		vector: number[] | undefined,
		topicVectors: Map<string, number[]> | null,
		model: LlmModelId,
	) {
		return this.termTopicAgent.generate(
			termTopicMessage(
				term.name,
				index,
				vector,
				topicVectors,
				term.links.length ? term.links : undefined,
			),
			{ topics: fixed },
			{ model },
		);
	}

	/** The old schema's topics; throws on a database already migrated */
	private async oldTopics(): Promise<OldTopics> {
		const conn = this.em.getConnection();
		const [{ old }]: { old: boolean }[] = await conn.execute(
			`select to_regclass('term_topics') is not null as old`,
		);
		if (!old)
			throw new Error(
				'This database has no term_topics table: the conversion reads the old links, so it runs on a clone before the topic-graph migration',
			);
		const rows: (OldTopics['rows'][number] & { parent: string | null })[] = await conn.execute(
			`select t.id, t.key, t.label, t.kind::text as kind, t.hint, p.key as parent
			from topics t left join topics p on p.id = t.parent_id and p.deleted_at is null
			where t.deleted_at is null order by t.key`,
		);
		// The topics alone, as the graph will hold them after the migration: a parent is an `is_a` edge
		const index = new TopicIndex(
			rows.map(t => ({
				id: t.id,
				key: t.key,
				label: t.label,
				kind: t.kind,
				isA: t.parent ? [t.parent] : [],
				has: [],
				hint: t.hint,
			})),
		);
		return { rows, index };
	}

	/** The decided wordings whose links one `same` link doesn't settle (the migration settles those), the most used first */
	private decidedTerms(): Promise<OldTerm[]> {
		return this.em.getConnection().execute(
			`select t.key, t.name, ${DECIDED_AT_SQL('t.decided_at')} as decided_at, coalesce(u.n, 0)::int as uses,
				json_agg(json_build_object('key', x.key, 'label', x.label, 'relation', tt.relation) order by tt.rank, tt.id) as links
			from terms t
			join term_topics tt on tt.term_id = t.id
			join topics x on x.id = tt.topic_id and x.deleted_at is null
			left join (select term_id, count(*) as n from statement_parts group by term_id) u on u.term_id = t.id
			where t.decided_by is not null and t.decided_at is not null
			group by t.id, u.n
			having not (count(*) = 1 and bool_and(tt.relation = 'same'))
			order by coalesce(u.n, 0) desc, t.id`,
		);
	}

	/** The wordings never decided, as the `terms` backlog takes them: the most used first */
	private undecidedTerms(): Promise<OldTerm[]> {
		return this.em.getConnection().execute(
			`select t.key, t.name, null as decided_at, coalesce(u.n, 0)::int as uses, '[]'::json as links
			from terms t
			left join (select term_id, count(*) as n from statement_parts group by term_id) u on u.term_id = t.id
			where t.decided_by is null
			order by coalesce(u.n, 0) desc, t.id`,
		);
	}

	/** Vectors in order, null when the embeddings account can't serve */
	private async embed(values: string[]): Promise<number[][] | null> {
		try {
			const out: number[][] = [];
			for (const chunk of _.chunk(values, EMBED_CHUNK)) {
				const res = await this.embeddingsService.embedMany(chunk, {
					dimensions: TOPIC_EMBEDDING_DIMENSIONS,
				});
				out.push(...res.embeddings);
			}
			return out;
		} catch (e) {
			this.logger.warn(`Embedding failed: ${(e as Error).message}`);
			return null;
		}
	}
}
