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
import { TopicKindEnum } from '../entities/topic.entity.js';
import {
	VENUE_TOPICS_CONCURRENCY,
	VENUE_TOPICS_MODEL,
	venueTopicsFile,
} from '../constants/venue-topics.constant.js';
import { CATEGORY_ROWS_SQL, type CategoryWording, categoryWordingsOf } from '../util/category-wordings.js';
import { NO_TOPIC, termDecisionOf, termTopicInputTopics, termTopicMessage } from '../util/term-topic-input.js';
import { TopicIndex } from '../util/topics.js';
import {
	appendVenueTopics,
	readVenueTopics,
	type VenueTopicsEntry,
	venueTopicsEntry,
} from '../util/venue-topics-file.js';

import { TopicService } from './topic.service.js';

// Answers between two appends to the file, so a run that dies keeps what it paid for
const SAVE_EVERY = 25;
const EMBED_CHUNK = 500;

export interface VenueTopicsPlan {
	/** Food categories the venues carry, main or other */
	categories: number;
	/** Of those, decided in this database already (by an admin, a name match or the agent) */
	decided: number;
	/** In the file already */
	inFile: number;
	/** A topic's key or label as a whole: decided without a call, with that topic */
	matched: (CategoryWording & { topicKey: string })[];
	/** Left for the agent */
	toAsk: CategoryWording[];
}

export interface VenueTopicsResult {
	categories: number;
	decided: number;
	inFile: number;
	matched: number;
	asked: number;
	/** Of `asked`, answered none */
	none: number;
	unanswered: number;
	usd: number;
	tokens: number;
	file: string;
}

/**
 * The one-off decision of every Google category no decision covers yet, run by hand
 * (`venue-topics.cli.ts`, paid, on a copy of production): a category that is a topic's name as a
 * whole is decided by the name match, every other is asked of agent C one a call, as the `terms`
 * backlog asks, on `VENUE_TOPICS_MODEL` (Haiku), and the answers are appended to
 * `tmp/venue-topics/results.jsonl`, which every database applies at boot
 * (`VenueTopicsImportService`). A second run continues the file. Writes nothing to the database
 * but the topics' missing vectors.
 */
@Injectable()
export class VenueTopicsConvertService {
	private readonly logger = new Logger(VenueTopicsConvertService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly termTopicAgent: TermTopicAgent,
		private readonly embeddingsService: EmbeddingsService,
	) {}

	/** What a run would do, nothing asked: the categories, the decided ones, the file's, the name matches and the ones left */
	async plan(index?: TopicIndex): Promise<VenueTopicsPlan> {
		const idx = index ?? (await this.topicService.index());
		const wordings = categoryWordingsOf(await this.em.getConnection().execute(CATEGORY_ROWS_SQL));
		const decidedRows: { key: string }[] = await this.em
			.getConnection()
			.execute(`select key from terms where decided_by is not null`);
		const decided = new Set(decidedRows.map(r => r.key));
		const file = readVenueTopics();
		const bare = new TopicIndex(idx.topics);
		const plan: VenueTopicsPlan = { categories: wordings.length, decided: 0, inFile: 0, matched: [], toAsk: [] };
		for (const w of wordings) {
			const topicKey = bare.exact(w.name) ?? bare.exact(w.key);
			if (decided.has(w.key)) plan.decided++;
			else if (file.has(w.key)) plan.inFile++;
			else if (topicKey) plan.matched.push({ ...w, topicKey });
			else plan.toAsk.push(w);
		}
		return plan;
	}

	/**
	 * Decides the categories `plan` leaves (the most carried first, `limit` of them), stopping before
	 * a call once `maxUsd` is spent: the name matches written without a call, the rest asked of the
	 * agent on `model`. `again` asks the file's agent answers of that kind once more instead (`none`;
	 * `aspect`: a main topic or modifier that is an aspect, which a category never is), a new line
	 * over the old: only before any database applied the file, since the import takes undecided
	 * wordings alone.
	 */
	async decide(
		opts: {
			model?: LlmModelId;
			limit?: number;
			maxUsd?: number;
			concurrency?: number;
			again?: ('none' | 'aspect')[];
		} = {},
	): Promise<VenueTopicsResult> {
		const model = opts.model ?? VENUE_TOPICS_MODEL;
		const index = await this.topicService.index();
		const plan = await this.plan(index);
		if (!opts.again?.length)
			appendVenueTopics(
				plan.matched.map(w =>
					venueTopicsEntry(w, { ...NO_TOPIC, topicKey: w.topicKey, exact: true }, { decidedBy: 'match' }),
				),
			);
		const isAspect = (key: string | null | undefined) => !!key && index.get(key)?.kind === TopicKindEnum.ASPECT;
		const again = (e: VenueTopicsEntry) =>
			e.decidedBy === 'ai' &&
			((opts.again!.includes('none') && !!e.none) ||
				(opts.again!.includes('aspect') && (isAspect(e.topic) || (e.modifiers ?? []).some(m => isAspect(m.topic)))));
		const toAsk = (
			opts.again?.length ?
				_.orderBy([...readVenueTopics().values()].filter(again), e => -e.venues).map(e => ({
					key: e.key,
					name: e.name,
					venues: e.venues,
				}))
			:	plan.toAsk).slice(0, opts.limit ?? Infinity);
		const result: VenueTopicsResult = {
			categories: plan.categories,
			decided: plan.decided,
			inFile: plan.inFile,
			matched: opts.again?.length ? 0 : plan.matched.length,
			asked: 0,
			none: 0,
			unanswered: 0,
			usd: 0,
			tokens: 0,
			file: venueTopicsFile(),
		};
		this.logger.log(
			`${plan.categories} food categories: ${plan.decided} decided here, ${plan.inFile} in the file, ` +
				`${plan.matched.length} a topic's name, ${toAsk.length} to ask on ${model}`,
		);
		if (!toAsk.length) return result;
		const fixed = termTopicInputTopics(index);
		const vectors = await this.topicService.vectors();
		const wordingVectors = vectors ? await this.embed(toAsk.map(w => w.name)) : null;
		if (!wordingVectors) this.logger.warn('No embeddings: every topic is offered on every call');
		let pending: VenueTopicsEntry[] = [];
		const flush = () => {
			appendVenueTopics(pending);
			pending = [];
		};
		await withLlmCallContext({ purpose: 'venue-topics' }, () =>
			runPool(
				toAsk.map((wording, i) => ({ wording, vector: wordingVectors?.[i] })),
				opts.concurrency ?? VENUE_TOPICS_CONCURRENCY,
				async ({ wording, vector }) => {
					if (opts.maxUsd !== undefined && result.usd >= opts.maxUsd) {
						result.unanswered++;
						return;
					}
					const res = await this.termTopicAgent.generate(
						termTopicMessage(wording.name, index, vector, vectors),
						{ topics: fixed },
						{ model },
					);
					const usd = answerUsd(res);
					const tokens = res.usage?.totalTokens ?? 0;
					result.asked++;
					result.usd += usd;
					result.tokens += tokens;
					const entry = venueTopicsEntry(wording, termDecisionOf(res.object, index), {
						decidedBy: 'ai',
						model: res.model ?? model,
						usd: Math.round(usd * 1e6) / 1e6,
						tokens,
					});
					if (entry.none) result.none++;
					pending.push(entry);
					if (pending.length >= SAVE_EVERY) {
						flush();
						this.logger.log(`${result.asked} of ${toAsk.length} asked, $${result.usd.toFixed(3)} so far`);
					}
				},
				({ wording }, e) => {
					result.unanswered++;
					this.logger.warn(`"${wording.name}" not answered: ${e.message}`);
				},
			),
		).finally(flush);
		return result;
	}

	/** The wordings' vectors, in order; null when the embeddings account can't serve */
	private async embed(names: string[]): Promise<number[][] | null> {
		try {
			const out: number[][] = [];
			for (const chunk of _.chunk(names, EMBED_CHUNK)) {
				const res = await this.embeddingsService.embedMany(chunk, { dimensions: TOPIC_EMBEDDING_DIMENSIONS });
				out.push(...res.embeddings);
			}
			return out.length === names.length ? out : null;
		} catch (e) {
			this.logger.warn(`Wordings not embedded: ${(e as Error).message}`);
			return null;
		}
	}
}
