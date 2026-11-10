import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';

import { Topic, TopicKindEnum } from '../entities/topic.entity.js';
import { TopicRelinkJob } from '../jobs/topic-relink.job.js';
import { aspectKey, type IndexedTerm, TopicIndex } from '../util/topics.js';

export interface TopicCounts {
	topic: Topic;
	/** The city's matched mentions resolving to it (not its children), all time */
	mentions: number;
	/** The city's venues whose Google category resolves to it */
	venues: number;
	/** The wordings linked to it (`term_topics`), any city */
	terms: number;
}

export interface TopicOverview {
	topics: TopicCounts[];
}

/** What an admin sets on a topic; on an update only the fields given change, null clears. */
export interface TopicInput {
	label?: string;
	kind?: TopicKindEnum;
	parentKey?: string | null;
	trendsTopicId?: string | null;
	trendsQuery?: string | null;
	/** An aspect's: what it covers, for the agents */
	hint?: string | null;
}

/**
 * The topics (`Topic`, one tree of kinds of food and aspects): the index every reader resolves raw
 * cuisines with and the agents' aspect legend comes from, the topics Google Trends searches, and
 * the admin's view of how the city's data maps onto them. The one writer of topics.
 */
@Injectable()
export class TopicService {
	constructor(
		private readonly em: EntityManager,
		private readonly pgBossService: PgBossService,
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

	async all(): Promise<Topic[]> {
		return this.em.find(Topic, { deletedAt: null }, { orderBy: { key: 'asc' } });
	}

	/**
	 * The index over every topic and every decided term, read fresh: topics are few, an admin may have
	 * just edited one, and the terms are one query.
	 */
	async index(): Promise<TopicIndex> {
		const [topics, terms] = await Promise.all([this.all(), this.decidedTerms()]);
		return toIndex(topics, terms);
	}

	/** Every decided wording with the keys of the topics it is (`Term`, `TermTopic`), for the index */
	private async decidedTerms(): Promise<IndexedTerm[]> {
		const rows: { key: string; name: string; topics: string[] }[] = await this.em.getConnection().execute(
			`select t.key, t.name, coalesce(array_agg(x.key order by tt.rank) filter (where x.key is not null), '{}') as topics
			from terms t
			left join term_topics tt on tt.term_id = t.id
			left join topics x on x.id = tt.topic_id and x.deleted_at is null
			where t.decided_by is not null
			group by t.id`,
		);
		return rows.map(r => ({ key: r.key, name: r.name, topicKeys: r.topics ?? [] }));
	}

	/** The topics Google Trends is searched for: those with a topic id or a query. */
	async searched(): Promise<Topic[]> {
		return (await this.all()).filter(t => t.trendsTopicId || t.trendsQuery);
	}

	/**
	 * A new topic. A food topic's key is the `normalizeCuisine` key of `key`, else of the label: 400
	 * when that says nothing ("Restaurant"), 409 naming the topic that has it ("Coffee" is the café's
	 * "cafe"). An aspect's key is `aspectKey` of the same ("Tip prompts" → `tip_prompts`).
	 */
	async create(
		input: TopicInput & { label: string; kind: TopicKindEnum; key?: string; discovered?: boolean },
		// A caller creating several in a row (topic discovery) re-links once itself, after its own writes:
		// a re-link running between them rewrites the same wordings' links in another unit of work
		opts: { relink?: boolean } = {},
	): Promise<Topic> {
		const raw = input.key ?? input.label;
		const key =
			input.kind === TopicKindEnum.ASPECT ? aspectKey(raw) : normalizeCuisine(raw);
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
		await this.apply(topic, input);
		this.em.persist(topic);
		await this.em.flush();
		if (opts.relink !== false) await this.queueRelink();
		return topic;
	}

	/** Changes what `input` gives; the key stays, since stored trends rows carry it. */
	async update(id: string, input: TopicInput): Promise<Topic> {
		const topic = await this.em.findOneOrFail(Topic, { id, deletedAt: null });
		await this.apply(topic, input);
		await this.em.flush();
		await this.queueRelink();
		return topic;
	}

	/**
	 * Deletes an aspect. A kind of food is never deleted (stored trends rows and tags carry its key),
	 * nor a root (readers group by the roots), nor an aspect with children (400 each). The claims
	 * filed under it move to its parent (their aspect parts re-pointed by SQL), so counts stay whole
	 * without an LLM; a term the agent linked to it alone is asked again.
	 */
	async remove(id: string): Promise<void> {
		const topic = await this.em.findOneOrFail(Topic, { id, deletedAt: null }, { populate: ['parent'] });
		if (topic.kind !== TopicKindEnum.ASPECT)
			throw new BadRequestException(`"${topic.label}" is a kind of food: topics are edited, never deleted`);
		if (!topic.parent) throw new BadRequestException(`"${topic.label}" is a root: the roots stay`);
		const children = await this.em.count(Topic, { parent: topic, deletedAt: null });
		if (children)
			throw new BadRequestException(`"${topic.label}" has ${children} aspects under it: move or delete them first`);
		// The links go with the topic; a term the agent linked to it alone is asked again (an admin's stays "none")
		await this.em.getConnection().execute(
			`update terms t set decided_by = null, decided_at = null
			where t.decided_by in ('ai', 'match')
				and exists (select 1 from term_topics tt where tt.term_id = t.id and tt.topic_id = ?)
				and (select count(*) from term_topics tt where tt.term_id = t.id) = 1`,
			[topic.id],
			'run',
		);
		await this.em.getConnection().execute(
			`update statement_parts set topic_id = ? where topic_id = ? and role = 'aspect'`,
			[topic.parent.id, topic.id],
			'run',
		);
		this.em.remove(topic);
		await this.em.flush();
		await this.queueRelink();
	}

	/**
	 * Sets the input's fields. A parent must exist, not sit under the topic, and be of the same side
	 * of the tree (an aspect under an aspect, a kind of food under a kind of food; 400); a stored
	 * topic never crosses that border (400). Aspects have no Trends fields (400 when given).
	 */
	private async apply(topic: Topic, input: TopicInput): Promise<void> {
		const others = (await this.all()).filter(t => t.key !== topic.key);
		const isAspect = (kind: TopicKindEnum) => kind === TopicKindEnum.ASPECT;
		if (input.label !== undefined) topic.label = input.label.trim();
		if (input.kind !== undefined) {
			if (topic.id && isAspect(input.kind) !== isAspect(topic.kind))
				throw new BadRequestException(
					isAspect(topic.kind) ?
						`"${topic.label}" is an aspect: points are filed under it, so it stays one`
					:	`"${topic.label}" is a kind of food: it can't become an aspect`,
				);
			topic.kind = input.kind;
		}
		if (isAspect(topic.kind) && (input.trendsTopicId || input.trendsQuery))
			throw new BadRequestException('An aspect is not searched on Google Trends');
		if (input.hint !== undefined) topic.hint = input.hint?.trim() || null;
		if (input.parentKey !== undefined) {
			if (input.parentKey === null) topic.parent = null;
			else {
				const parent = others.find(t => t.key === input.parentKey);
				if (!parent) throw new BadRequestException(`No topic "${input.parentKey}"`);
				if (isAspect(parent.kind) !== isAspect(topic.kind))
					throw new BadRequestException(
						isAspect(topic.kind) ?
							`"${parent.label}" is a kind of food: an aspect sits under an aspect`
						:	`"${parent.label}" is an aspect: a kind of food sits under a kind of food`,
					);
				// A new topic has no children yet, so only a stored one can become its own ancestor
				const byId = new Map(others.map(t => [t.id, t]));
				for (
					let up: Topic | undefined = parent;
					topic.id && up;
					up = up.parent ? byId.get(up.parent.id) : undefined
				) {
					if (up.parent && up.parent.id === topic.id) {
						throw new BadRequestException(
							`"${parent.label}" sits under "${topic.label}": pick another parent`,
						);
					}
				}
				topic.parent = parent;
			}
		}
		if (input.trendsTopicId !== undefined)
			topic.trendsTopicId = input.trendsTopicId?.trim() || null;
		if (input.trendsQuery !== undefined) topic.trendsQuery = input.trendsQuery?.trim() || null;
	}

	async overview(cityId: string): Promise<TopicOverview> {
		const [topics, terms] = await Promise.all([this.all(), this.decidedTerms()]);
		const index = toIndex(topics, terms);
		const conn = this.em.getConnection();
		const [mentionRows, venueRows, termRows] = await Promise.all([
			conn.execute<{ cuisine: string | null; category: string | null; n: number }[]>(
				`select m.cuisine, v.category, count(*)::int as n from mentions m
					join venues v on v.id = m.venue_id
					where v.city_id = ? group by 1, 2`,
				[cityId],
			),
			conn.execute<{ category: string | null; n: number }[]>(
				`select category, count(*)::int as n from venues where city_id = ? group by 1`,
				[cityId],
			),
			conn.execute<{ topic_id: string; n: number }[]>(
				`select topic_id, count(*)::int as n from term_topics group by 1`,
			),
		]);
		const termCounts = new Map(termRows.map(r => [r.topic_id, r.n]));
		const mentions = new Map<string, number>();
		const venues = new Map<string, number>();
		for (const r of mentionRows)
			for (const k of index.resolveMention(r.cuisine, r.category))
				mentions.set(k, (mentions.get(k) ?? 0) + r.n);
		for (const r of venueRows)
			for (const k of index.resolve(r.category)) venues.set(k, (venues.get(k) ?? 0) + r.n);
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

const toIndex = (topics: Topic[], terms: IndexedTerm[] = []) =>
	new TopicIndex(
		topics.map(t => ({
			id: t.id,
			key: t.key,
			label: t.label,
			kind: t.kind,
			parentKey: t.parent ? (topics.find(p => p.id === t.parent!.id)?.key ?? null) : null,
			hint: t.hint ?? null,
		})),
		terms,
	);
