import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { runPool } from 'src/shared/util/pool.js';

import {
	DISCOVERY_KINDS,
	type DiscoveryInputTopic,
	type DiscoveryInputWording,
	TopicDiscoveryAgent,
} from '../agents/topic-discovery.agent.js';
import type { TermRelation } from '../constants/term-relation.constant.js';
import { Term } from '../entities/term.entity.js';
import { TopicKindEnum } from '../entities/topic.entity.js';
import { TopicIndex } from '../util/topics.js';

import { TermService } from './term.service.js';
import { TopicService } from './topic.service.js';

/** Wordings a call groups, and a backlog batch takes */
const PER_CALL = 150;
const BATCH = 600;
/** A wording needs this many uses to be grouped at all */
export const MIN_TERM_USES = 2;
/** A new topic needs its wordings to sum to this many uses from this many sources (a topic for one review is noise) */
export const MIN_TOPIC_USES = 15;
export const MIN_TOPIC_SOURCES = 5;
/** A wording is grouped again after this many days, as the data grows */
export const REGROUP_DAYS = 30;
const MAX_LINKS = 5;

interface Candidate {
	id: number;
	name: string;
	uses: number;
	sources: number;
}

export interface DiscoveryResult {
	/** Wordings sent, and stamped `groupedAt` */
	looked: number;
	/** New topics created, by label */
	created: string[];
	/** Wordings linked to a group's topic (new or existing) */
	linked: number;
	/** New topics the agent proposed that fell below the floors (not created) */
	belowFloor: number;
	tokens: number;
}

/**
 * Topic discovery: wordings people use (decided by agent C or an admin: unlinked, linked only `kind_of`
 * / `with`, or the same thing as a broader topic that may deserve a finer one) are grouped by agent D (`TopicDiscoveryAgent`) into the topics they are, and
 * the new ones are created live under their parent (`Topic.discoveredAt`; the user's call: no review
 * step), above the floors (`MIN_TOPIC_USES`, `MIN_TOPIC_SOURCES`); each wording gets the group's topic
 * as its first link and keeps the ones it had. The backlog `topic-discovery` (after `terms`). Topic
 * creation queues the re-link, which gives a wording that is now a topic's name its exact match.
 */
@Injectable()
export class TopicDiscoveryService implements OnModuleInit {
	private readonly logger = new Logger(TopicDiscoveryService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly termService: TermService,
		private readonly topicDiscoveryAgent: TopicDiscoveryAgent,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'topic-discovery',
			label: 'New topics from wordings',
			priority: 30,
			remaining: () => this.countCandidates(),
			runBatch: async () => {
				const res = await this.discover({ limit: BATCH });
				return { done: res.looked, tokens: res.tokens };
			},
		});
	}

	/**
	 * The wordings discovery would group: decided by agent C or an admin (a name match is a topic's own
	 * name already), used enough, not grouped lately. An admin's links are kept: a finer topic is added
	 * in front of them ("smash burger", the seed's alias of Burgers, can still become Smash burgers).
	 */
	private candidatesSql(select: string, tail = '') {
		return `select ${select} from terms t
			join (
				select sp.term_id, count(*)::int as uses,
					count(distinct coalesce(s.review_id::text, s.post_id::text, s.comment_id::text, s.web_mention_id::text, s.venue_id::text))::int as sources
				from statement_parts sp join statements s on s.id = sp.statement_id
				where sp.role = 'food' group by sp.term_id
			) u on u.term_id = t.id
			where t.decided_by in ('ai', 'admin') and u.uses >= ?
				and (t.grouped_at is null or t.grouped_at < ?)
			${tail}`;
	}

	private regroupBefore(now: Date): Date {
		return new Date(now.getTime() - REGROUP_DAYS * 24 * 3600 * 1000);
	}

	async countCandidates(now = new Date()): Promise<number> {
		const [{ n }]: { n: number }[] = await this.em
			.getConnection()
			.execute(this.candidatesSql('count(*)::int as n'), [MIN_TERM_USES, this.regroupBefore(now)]);
		return n;
	}

	/**
	 * Groups up to `limit` candidate wordings (most used first) and applies the groups: an existing
	 * topic links its wordings; a new one is created under its parent when its wordings reach the
	 * floors, then linked. Every wording sent is stamped `groupedAt`. Flushes.
	 */
	async discover(opts: { limit: number; now?: Date }): Promise<DiscoveryResult> {
		const now = opts.now ?? new Date();
		const rows: Candidate[] = await this.em
			.getConnection()
			.execute(this.candidatesSql('t.id, t.name, u.uses, u.sources', 'order by u.uses desc, t.id limit ?'), [
				MIN_TERM_USES,
				this.regroupBefore(now),
				opts.limit,
			]);
		const result: DiscoveryResult = { looked: 0, created: [], linked: 0, belowFloor: 0, tokens: 0 };
		if (!rows.length) return result;
		const terms = await this.em.find(Term, { id: { $in: rows.map(r => r.id) } }, { populate: ['topics', 'topics.topic'] });
		const termById = new Map(terms.map(t => [String(t.id), t]));
		const rowById = new Map(rows.map(r => [String(r.id), r]));
		let index = await this.topicService.index();
		const legend: DiscoveryInputTopic[] = index.topics
			.filter(t => t.kind !== TopicKindEnum.ASPECT)
			.map(t => ({ key: t.key, label: t.label, kind: t.kind, ...(t.parentKey && { parent: t.parentKey }) }));

		type Group = { existing: string | null; label: string | null; kind: string | null; parent: string | null; wordings: { id: string; relation: TermRelation }[] };
		const groups: Group[] = [];
		await runPool(
			_.chunk(rows, PER_CALL),
			2,
			async chunk => {
				const wordings: DiscoveryInputWording[] = chunk.map(r => ({
					id: String(r.id),
					name: r.name,
					uses: r.uses,
					links: (termById.get(String(r.id))?.topics.getItems() ?? [])
						.filter(l => !l.topic.deletedAt)
						.map(l => ({ key: l.topic.key, relation: l.relation })),
				}));
				const res = await this.topicDiscoveryAgent.generate(JSON.stringify({ topics: legend, wordings }));
				result.tokens += res.usage?.totalTokens ?? 0;
				groups.push(...res.object.groups);
			},
			(chunk, e) => this.logger.warn(`Topic discovery call of ${chunk.length} wordings failed: ${e.message}`),
		);

		// One group per wording (the first that claims it); the group's target topic, created when new and above the floors
		const claimed = new Set<string>();
		const targets: { key: string; wordings: { id: string; relation: TermRelation }[] }[] = [];
		for (const group of groups) {
			const wordings = _.uniqBy(
				group.wordings.filter(w => rowById.has(w.id) && !claimed.has(w.id)),
				w => w.id,
			);
			if (!wordings.length) continue;
			const key = await this.targetOf(group, wordings, rowById, index, result);
			if (!key) continue;
			if (!index.get(key)) index = await this.topicService.index();
			wordings.forEach(w => claimed.add(w.id));
			targets.push({ key, wordings });
		}

		// The group's topic first, the links a wording had after it (a finer topic never drops a coarser one)
		for (const { key, wordings } of targets) {
			for (const { id, relation } of wordings) {
				const term = termById.get(id);
				if (!term) continue;
				const relations = new Map<string, TermRelation>([[key, relation]]);
				for (const link of term.topics.getItems())
					if (!link.topic.deletedAt && !relations.has(link.topic.key)) relations.set(link.topic.key, link.relation);
				const keys = [...relations.keys()].filter(k => index.get(k)).slice(0, MAX_LINKS);
				this.termService.setLinks(term, keys, index, term.decidedBy ?? 'ai', now, relations);
				term.suggestion = null;
				result.linked++;
			}
		}
		for (const term of terms) term.groupedAt = now;
		result.looked = terms.length;
		await this.em.flush();
		return result;
	}

	/** The key a group links its wordings to: an existing topic, or a new one created when it passes the checks */
	private async targetOf(
		group: { existing: string | null; label: string | null; kind: string | null; parent: string | null },
		wordings: { id: string }[],
		rows: Map<string, Candidate>,
		index: TopicIndex,
		result: DiscoveryResult,
	): Promise<string | null> {
		const food = (key: string | null | undefined) => {
			const topic = key ? index.get(key) : undefined;
			return topic && topic.kind !== TopicKindEnum.ASPECT ? topic.key : null;
		};
		if (group.existing) return food(group.existing) ?? food(index.exact(group.existing));
		const label = group.label?.trim();
		if (!label || !group.kind || !(DISCOVERY_KINDS as readonly string[]).includes(group.kind)) return null;
		// A label that is a topic already (its key or label, or what its key would be) links to it, never a
		// twin; topics alone, never a wording's link ("Smash burgers" is no twin of Burgers for its alias)
		const bare = new TopicIndex(index.topics);
		const already = food(bare.exact(label)) ?? food(normalizeCuisine(label));
		if (already) return already;
		const uses = _.sumBy(wordings, w => rows.get(w.id)?.uses ?? 0);
		const sources = _.sumBy(wordings, w => rows.get(w.id)?.sources ?? 0);
		if (uses < MIN_TOPIC_USES || sources < MIN_TOPIC_SOURCES) {
			result.belowFloor++;
			return null;
		}
		try {
			const topic = await this.topicService.create({
				label,
				kind: group.kind as TopicKindEnum,
				parentKey: food(group.parent),
				discovered: true,
			});
			result.created.push(topic.label);
			return topic.key;
		} catch (e) {
			this.logger.warn(`Topic discovery could not create "${label}": ${(e as Error).message}`);
			return null;
		}
	}
}
