import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { EmbeddingsService } from 'src/modules/llm/services/embeddings.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { FOOD_TOPIC_KEYS_SQL } from 'src/modules/statements/util/statement-foods.js';
import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { parseVectorLiteral, toVectorLiteral } from 'src/shared/util/vector.js';

import {
	defaultEdgeType,
	type EdgeDecider,
	type EdgeType,
	TOPIC_EMBEDDING_DIMENSIONS,
} from '../constants/topic-edge.constant.js';
import { Topic, TopicKindEnum } from '../entities/topic.entity.js';
import { TopicEdge } from '../entities/topic-edge.entity.js';
import { TopicRelinkJob } from '../jobs/topic-relink.job.js';
import { rebuildTopicClosure } from '../util/topic-closure.js';
import { topicEmbeddingText } from '../util/topic-shortlist.js';
import { aspectKey, type IndexedTerm, TopicIndex } from '../util/topics.js';

export interface TopicCounts {
	topic: Topic;
	/** The city's matched mentions whose claims name it (not its children), all time */
	mentions: number;
	/** The city's venues whose Google category resolves to it */
	venues: number;
	/** The wordings whose main topic it is (`terms.topic_id`), any city */
	terms: number;
}

export interface TopicOverview {
	topics: TopicCounts[];
}

/** One edge as a caller states it: the topic it points at, by key; the type defaults from that topic's kind (`defaultEdgeType`) */
export interface TopicEdgeInput {
	to: string;
	type?: EdgeType;
}

/** What an admin sets on a topic; on an update only the fields given change, null clears. */
export interface TopicInput {
	label?: string;
	kind?: TopicKindEnum;
	/**
	 * Everything the topic is and has, in order: the whole list (an edge left out is removed). The
	 * first `is_a` is its display parent. `[]` makes it a root.
	 */
	edges?: TopicEdgeInput[];
	trendsTopicId?: string | null;
	trendsQuery?: string | null;
	/** An aspect's: what it covers, for the agents */
	hint?: string | null;
}

/** Topics an embedding request carries */
const EMBED_CHUNK = 500;

/**
 * The topics (`Topic`, the nodes: kinds of food and aspects) and the edges between them
 * (`TopicEdge`): the index every reader resolves raw food text with (Google categories, menus,
 * hashtags) and the agents' aspect legend comes from, the topics Google Trends searches, the
 * vectors the wordings' shortlist reads, and the admin's view of how the city's data maps onto
 * them. The one writer of topics and edges; every
 * change rebuilds `topic_closure` in its transaction.
 */
@Injectable()
export class TopicService {
	private readonly logger = new Logger(TopicService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly pgBossService: PgBossService,
		private readonly embeddingsService: EmbeddingsService,
	) {}

	/**
	 * Queues the re-link of everything stored against topics (`TopicRelinkService`): after every
	 * change to a topic, so a change reaches every page the way matching on read did.
	 * One runs and one waits.
	 */
	async queueRelink(): Promise<void> {
		await this.pgBossService.sendJob(TopicRelinkJob.jobName, new TopicRelinkJob({}), {
			singletonKey: TopicRelinkJob.singletonKey,
		});
	}

	/** Every topic with its edges loaded (`edges`, and so `parent`) */
	async all(): Promise<Topic[]> {
		return this.em.find(
			Topic,
			{ deletedAt: null },
			{ orderBy: { key: 'asc' }, populate: ['edges'] },
		);
	}

	/**
	 * The index over every topic with its edges and every decided term, read fresh: topics are few,
	 * an admin may have just edited one, and the terms are one query.
	 */
	async index(): Promise<TopicIndex> {
		const topics = await this.all();
		return toIndex(topics, await this.decidedTerms());
	}

	/** Every decided wording with its main topic's key and its modifiers (`Term`, `TermModifier`), for the index */
	private async decidedTerms(): Promise<IndexedTerm[]> {
		const rows: {
			key: string;
			name: string;
			topic: string | null;
			exact: boolean;
			modifiers: { topicKey: string; type: EdgeType }[] | null;
		}[] = await this.em.getConnection().execute(
			`select t.key, t.name, x.key as topic, t.exact,
				(select json_agg(json_build_object('topicKey', mx.key, 'type', tm.type) order by tm.rank)
					from term_modifiers tm join topics mx on mx.id = tm.topic_id and mx.deleted_at is null
					where tm.term_id = t.id) as modifiers
			from terms t
			left join topics x on x.id = t.topic_id and x.deleted_at is null
			where t.decided_by is not null`,
		);
		return rows.map(r => ({
			key: r.key,
			name: r.name,
			topicKey: r.topic,
			exact: r.exact,
			modifiers: r.modifiers ?? [],
		}));
	}

	/** Rebuilds `topic_closure` from the topics and edges as stored: after raw SQL changed either (an em flush rebuilds it by itself) */
	async rebuildClosure(): Promise<void> {
		await rebuildTopicClosure(text =>
			this.em.getConnection().execute(text, [], 'run', this.em.getTransactionContext()),
		);
	}

	/**
	 * Embeds every topic that has no vector, or whose text (`topicEmbeddingText`: its label, an
	 * aspect's hint too) changed since: cents for the whole table, filed in the ledger under the
	 * embeddings account. Returns how many it embedded. Throws what the embeddings account throws.
	 */
	async embedPending(): Promise<number> {
		const rows: { id: string; label: string; kind: TopicKindEnum; hint: string | null; text: string | null }[] =
			await this.em.getConnection().execute(
				`select id, label, kind, hint, case when embedding is null then null else embedded_text end as text
				from topics where deleted_at is null`,
			);
		const pending = rows
			.map(r => ({ id: r.id, text: topicEmbeddingText(r), was: r.text }))
			.filter(r => r.text !== r.was);
		for (const chunk of _.chunk(pending, EMBED_CHUNK)) {
			const { embeddings } = await this.embeddingsService.embedMany(
				chunk.map(r => r.text),
				{ dimensions: TOPIC_EMBEDDING_DIMENSIONS },
			);
			const values = chunk
				.map(() => `(?::uuid, ?::halfvec(${TOPIC_EMBEDDING_DIMENSIONS}), ?::text)`)
				.join(', ');
			await this.em.getConnection().execute(
				`update topics t set embedding = v.embedding, embedded_text = v.text
				from (values ${values}) as v(id, embedding, text) where t.id = v.id`,
				chunk.flatMap((r, i) => [r.id, toVectorLiteral(embeddings[i]), r.text]),
			);
		}
		return pending.length;
	}

	/**
	 * Every topic's vector by key, the missing ones embedded first; null when the embeddings account
	 * can't serve (no credit, mocked in a test): the caller then offers every topic.
	 */
	async vectors(): Promise<Map<string, number[]> | null> {
		try {
			await this.embedPending();
		} catch (e) {
			this.logger.warn(`Topics not embedded: ${(e as Error).message}`);
			return null;
		}
		const rows: { key: string; embedding: string }[] = await this.em
			.getConnection()
			.execute(
				`select key, embedding::text as embedding from topics where deleted_at is null and embedding is not null`,
			);
		return new Map(rows.map(r => [r.key, parseVectorLiteral(r.embedding)]));
	}

	/** The topics Google Trends is searched for: those with a topic id or a query. */
	async searched(): Promise<Topic[]> {
		return (await this.all()).filter(t => t.trendsTopicId || t.trendsQuery);
	}

	/**
	 * A new topic. A food topic's key is the `normalizeCuisine` key of `key`, else of the label: 400
	 * when that says nothing ("Restaurant"), 409 naming the topic that has it ("Coffee" is the café's
	 * "cafe"). An aspect's key is `aspectKey` of the same ("Tip prompts" → `tip_prompts`). Its edges
	 * are stated by `by` (an admin by default; promotion says `ai`).
	 */
	async create(
		input: TopicInput & { label: string; kind: TopicKindEnum; key?: string; discovered?: boolean },
		// A caller creating several in a row (promotion) re-links once itself, after its own writes:
		// a re-link running between them rewrites the same wordings in another unit of work
		opts: { relink?: boolean; by?: EdgeDecider } = {},
	): Promise<Topic> {
		const raw = input.key ?? input.label;
		const key = topicKeyOf(raw, input.kind);
		if (!key)
			throw new BadRequestException(
				input.kind === TopicKindEnum.ASPECT ?
					`"${raw}" makes no key`
				:	`"${raw}" names no kind of food`,
			);
		const taken = await this.em.findOne(Topic, { key });
		// "Coffee" makes the key "cafe": say which topic has it, so the admin picks another label
		if (taken)
			throw new ConflictException(
				`"${input.key ?? input.label}" makes the key "${key}", which ${taken.label} has: pick another label`,
			);
		// Built outside the unit of work until `apply` accepted it: `apply` queries, and MikroORM's
		// auto-flush would insert a half-checked row before a 400
		const topic = new Topic();
		topic.key = key;
		topic.label = input.label.trim();
		topic.kind = input.kind;
		if (input.discovered) topic.discoveredAt = new Date();
		const edges = await this.apply(topic, input);
		this.em.persist(topic);
		this.setEdges(topic, edges ?? [], opts.by ?? 'admin');
		await this.save();
		if (opts.relink !== false) await this.queueRelink();
		return topic;
	}

	/** Changes what `input` gives; the key stays, since stored trends rows carry it. */
	async update(id: string, input: TopicInput, opts: { by?: EdgeDecider } = {}): Promise<Topic> {
		const topic = await this.em.findOneOrFail(
			Topic,
			{ id, deletedAt: null },
			{ populate: ['edges', 'edges.to'] },
		);
		const edges = await this.apply(topic, input);
		if (edges) this.setEdges(topic, edges, opts.by ?? 'admin');
		await this.save();
		await this.queueRelink();
		return topic;
	}

	/**
	 * Deletes an aspect. A kind of food is never deleted (stored trends rows and tags carry its key),
	 * nor a root (readers group by the roots), nor an aspect with children (400 each). The claims
	 * filed under it move to its root (their aspect parts re-pointed by SQL), so counts stay whole
	 * without an LLM; a wording the agent or a name match gave it is asked again.
	 */
	async remove(id: string): Promise<void> {
		const topic = await this.em.findOneOrFail(
			Topic,
			{ id, deletedAt: null },
			{ populate: ['edges', 'edges.to'] },
		);
		if (topic.kind !== TopicKindEnum.ASPECT)
			throw new BadRequestException(`"${topic.label}" is a kind of food: topics are edited, never deleted`);
		const parent = topic.edges.getItems().find(e => e.type === 'is_a')?.to;
		if (!parent) throw new BadRequestException(`"${topic.label}" is a root: the roots stay`);
		const children = await this.em.count(TopicEdge, { to: topic, type: 'is_a' });
		if (children)
			throw new BadRequestException(`"${topic.label}" has ${children} aspects under it: move or delete them first`);
		await this.inTransaction(async () => {
			const run = (sql: string, params: unknown[]) =>
				this.em.getConnection().execute(sql, params, 'run', this.em.getTransactionContext());
			// A wording the agent or a name match pointed at it is asked again (an admin's stays, with no topic)
			await run(
				`update terms set decided_by = null, decided_at = null, topic_id = null, exact = false
				where topic_id = ? and decided_by in ('ai', 'match')`,
				[topic.id],
			);
			await run(`update statement_parts set topic_id = ? where topic_id = ? and role = 'aspect'`, [
				parent.id,
				topic.id,
			]);
			this.em.remove(topic);
			await this.em.flush();
		});
		await this.queueRelink();
	}

	/**
	 * Sets the input's scalar fields and checks its edges, returning them resolved (undefined when
	 * `input.edges` is not given: the stored ones stay). The rules, 400 each: an edge points at
	 * another topic of the same side (food to food, aspect to aspect), once; no cycle through any
	 * edges; an aspect has one `is_a` at most, to a root, and no `has`, and an aspect with aspects
	 * under it stays a root (two levels: the labeller, the aspect pages and the root readers rely on
	 * it); a stored topic never changes side. Aspects have no Trends fields.
	 */
	private async apply(
		topic: Topic,
		input: TopicInput,
	): Promise<{ to: Topic; type: EdgeType }[] | undefined> {
		const all = await this.all();
		const others = all.filter(t => t.key !== topic.key);
		const isAspect = (kind: TopicKindEnum) => kind === TopicKindEnum.ASPECT;
		if (input.label !== undefined) topic.label = input.label.trim();
		if (input.kind !== undefined) {
			if (topic.id && isAspect(input.kind) !== isAspect(topic.kind))
				throw new BadRequestException(
					isAspect(topic.kind) ?
						`"${topic.label}" is an aspect: claims are filed under it, so it stays one`
					:	`"${topic.label}" is a kind of food: it can't become an aspect`,
				);
			topic.kind = input.kind;
		}
		if (isAspect(topic.kind) && (input.trendsTopicId || input.trendsQuery))
			throw new BadRequestException('An aspect is not searched on Google Trends');
		if (input.hint !== undefined) topic.hint = input.hint?.trim() || null;
		if (input.trendsTopicId !== undefined)
			topic.trendsTopicId = input.trendsTopicId?.trim() || null;
		if (input.trendsQuery !== undefined) topic.trendsQuery = input.trendsQuery?.trim() || null;
		if (input.edges === undefined) return undefined;

		// Every stored topic, this one too: a loop is found by walking from the target back to it
		const index = toIndex(all);
		const edges: { to: Topic; type: EdgeType }[] = [];
		for (const given of input.edges) {
			const to = others.find(t => t.key === given.to);
			if (!to)
				throw new BadRequestException(
					given.to === topic.key ?
						`"${topic.label}" can't point at itself`
					:	`No topic "${given.to}"`,
				);
			if (isAspect(to.kind) !== isAspect(topic.kind))
				throw new BadRequestException(
					isAspect(topic.kind) ?
						`"${to.label}" is a kind of food: an aspect sits under an aspect`
					:	`"${to.label}" is an aspect: a kind of food relates to kinds of food`,
				);
			if (edges.some(e => e.to === to))
				throw new BadRequestException(`"${to.label}" is given twice`);
			// A new topic has nothing pointing at it yet, so only a stored one can close a loop
			if (topic.id && index.ancestors([to.key]).includes(topic.key))
				throw new BadRequestException(
					`"${to.label}" already counts for "${topic.label}": that would be a loop`,
				);
			edges.push({ to, type: given.type ?? defaultEdgeType(to.kind) });
		}
		if (isAspect(topic.kind)) {
			if (edges.some(e => e.type === 'has'))
				throw new BadRequestException('An aspect has no "has" relation: it sits under one root');
			if (edges.length > 1)
				throw new BadRequestException(`"${topic.label}" is an aspect: it sits under one root`);
			const root = edges[0]?.to;
			if (root && !index.isRoot(root.key))
				throw new BadRequestException(`"${root.label}" is no root: an aspect sits under a root`);
			if (root && topic.id && all.some(t => t.edges.getItems().some(e => e.to.id === topic.id)))
				throw new BadRequestException(
					`"${topic.label}" has aspects under it: it stays a root`,
				);
		}
		return edges;
	}

	/**
	 * Makes the topic's edges the given list: an edge already there keeps its row and who decided it
	 * and takes its new rank, the gone ones are removed, the new ones are `by`'s. Ranks count per
	 * type, in the order given. `topic.edges` must be loaded (a new topic's is empty).
	 */
	private setEdges(topic: Topic, wanted: { to: Topic; type: EdgeType }[], by: EdgeDecider) {
		const id = (e: { to: Topic; type: EdgeType }) => `${e.type} ${e.to.id ?? e.to.key}`;
		const current = new Map(topic.edges.getItems().map(e => [id(e), e]));
		const keep = new Set(wanted.map(id));
		for (const [k, edge] of current) {
			if (keep.has(k)) continue;
			topic.edges.remove(edge);
			this.em.remove(edge);
		}
		const ranks: Record<EdgeType, number> = { is_a: 0, has: 0 };
		for (const want of wanted) {
			const rank = ranks[want.type]++;
			const edge = current.get(id(want));
			if (edge) edge.rank = rank;
			else
				topic.edges.add(
					this.em.create(TopicEdge, {
						from: topic,
						to: want.to,
						type: want.type,
						rank,
						decidedBy: by,
					}),
				);
		}
	}

	/** Flushes inside a transaction, so the closure's rebuild (`TopicClosureSubscriber`) is in it */
	private async save(): Promise<void> {
		await this.inTransaction(() => this.em.flush());
	}

	private async inTransaction(work: () => Promise<void>): Promise<void> {
		if (this.em.isInTransaction()) return work();
		await this.em.begin();
		try {
			await work();
			await this.em.commit();
		} catch (e) {
			await this.em.rollback();
			throw e;
		}
	}

	async overview(cityId: string): Promise<TopicOverview> {
		const topics = await this.all();
		const index = toIndex(topics, await this.decidedTerms());
		const conn = this.em.getConnection();
		const [mentionRows, venueRows, termRows] = await Promise.all([
			// The city's matched mentions per kind of food their claims name
			conn.execute<{ key: string; n: number }[]>(
				`select k.key, count(*)::int as n from mentions m
					join venues v on v.id = m.venue_id
					cross join lateral unnest(${FOOD_TOPIC_KEYS_SQL('st.mention_id = m.id')}) as k(key)
					where v.city_id = ? group by 1`,
				[cityId],
			),
			conn.execute<{ category: string | null; n: number }[]>(
				`select category, count(*)::int as n from venues where city_id = ? group by 1`,
				[cityId],
			),
			conn.execute<{ topic_id: string; n: number }[]>(
				`select topic_id, count(*)::int as n from terms where topic_id is not null group by 1`,
			),
		]);
		const termCounts = new Map(termRows.map(r => [r.topic_id, r.n]));
		const mentions = new Map<string, number>();
		const venues = new Map<string, number>();
		for (const r of mentionRows) mentions.set(r.key, r.n);
		for (const r of venueRows)
			for (const k of index.wordingTopics(r.category)) venues.set(k, (venues.get(k) ?? 0) + r.n);
		return {
			topics: topics.map(topic => ({
				topic,
				mentions: mentions.get(topic.key) ?? 0,
				venues: venues.get(topic.key) ?? 0,
				terms: termCounts.get(topic.id) ?? 0,
			})),
		};
	}
}

/** A topic's key from a label or a given key: `normalizeCuisine` for a kind of food, `aspectKey` for an aspect; null when it says nothing */
export const topicKeyOf = (raw: string, kind: TopicKindEnum): string | null =>
	(kind === TopicKindEnum.ASPECT ? aspectKey(raw) : normalizeCuisine(raw)) || null;

/** The index over topics loaded with their edges (`TopicService.all`) */
export const toIndex = (topics: Topic[], terms: IndexedTerm[] = []) => {
	const keyById = new Map(topics.map(t => [t.id, t.key]));
	const keys = (topic: Topic, type: EdgeType) =>
		topic.edges.isInitialized() ?
			_.sortBy(
				topic.edges.getItems().filter(e => e.type === type),
				e => e.rank,
			)
				.map(e => keyById.get(e.to.id))
				.filter((k): k is string => !!k)
		:	[];
	return new TopicIndex(
		topics.map(t => ({
			id: t.id,
			key: t.key,
			label: t.label,
			kind: t.kind,
			isA: keys(t, 'is_a'),
			has: keys(t, 'has'),
			hint: t.hint ?? null,
		})),
		terms,
	);
};
