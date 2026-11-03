import { EntityManager } from '@mikro-orm/postgresql';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleInit,
} from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { termKey } from 'src/modules/venues/util/dishes.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import { answerUsd } from 'src/modules/llm/util/llm-cost.js';
import { runPool } from 'src/shared/util/pool.js';

import { TermTopicAgent } from '../agents/term-topic.agent.js';
import type { TermRelation } from '../constants/term-relation.constant.js';
import { Term, TermDecider } from '../entities/term.entity.js';
import { TermTopic } from '../entities/term-topic.entity.js';
import { Topic, TopicKindEnum } from '../entities/topic.entity.js';
import { termAnswerLinks, termTopicInput, termTopicInputTopics } from '../util/term-topic-input.js';
import { TopicIndex } from '../util/topics.js';

import { TopicService } from './topic.service.js';
import { TopicRelinkService } from './topic-relink.service.js';

// Wordings read side by side, one a call
const CONCURRENCY = 10;
// Wordings a daily-backlog batch decides (~5 agent calls)
const BACKLOG_BATCH_TERMS = 500;
const CHUNK = 500;
const EXAMPLES = 3;
const MAX_LINKS = 10;

/** Rows an update touched, from `execute(…, 'run')` */
const affected = (result: unknown) => (result as { affectedRows?: number }).affectedRows ?? 0;

/** Which terms an admin list shows */
export type TermStatus = 'unlinked' | 'linked' | 'pending' | 'all';

export interface TermListRow {
	id: number;
	key: string;
	name: string;
	topics: { key: string; label: string; kind: string }[];
	decidedBy?: TermDecider;
	suggestion?: string;
	/** The city's statements naming it (food parts) */
	notes: number;
	/** The city's venues whose Google tags carry it */
	tagVenues: number;
}

export interface TermList {
	summary: {
		terms: number;
		uses: number;
		linkedTerms: number;
		linkedUses: number;
		pendingTerms: number;
	};
	suggestions: { label: string; terms: number; uses: number; examples: string[] }[];
	terms: TermListRow[];
	total: number;
}

/** An admin's decision on a term: the topics it is (empty = none), or back to the name match and the agent */
export type TermChange = { topicKeys: string[] } | { auto: true };

/**
 * Every wording ever seen (`Term`) and the topics each is (`TermTopic`): the one writer of both. A
 * statement's food parts point at terms and take their links at read time, so a decision here
 * moves every statement at once. A wording is decided once: by a name match when it is a topic's key or label as a
 * whole (`match`, against the topics alone, never against other terms), else by `TermTopicAgent` in
 * the daily LLM backlog `terms` (every kind of topic offered, a list answered), else by an admin
 * (`admin`, never changed by anything else). Decided terms are part of `TopicIndex`
 * (`TopicService.index`), so a decision reaches mention cuisines, Google categories, delivery menus,
 * hashtags and Google's tags through the relink job, whose re-linker `terms` runs first.
 */
@Injectable()
export class TermService implements OnModuleInit {
	private readonly logger = new Logger(TermService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly topicRelinkService: TopicRelinkService,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
		private readonly termTopicAgent: TermTopicAgent,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'terms',
			label: 'Topics for wordings',
			priority: 25,
			remaining: () => this.countPending(),
			runBatch: async () => {
				const res = await this.decide({ limit: BACKLOG_BATCH_TERMS });
				return { done: res.looked, tokens: res.tokens };
			},
		});
		this.topicRelinkService.register({ key: 'terms', relink: index => this.relink(index) });
	}

	/**
	 * The terms of the wordings given (agent B's food wordings), stored when missing, each spelled
	 * as first seen: a new one is decided at once by a name match when it is a topic's key or label
	 * as a whole, else waits for the `terms` backlog. By `termKey`; empty keys dropped. Inserts
	 * outside the unit of work (idempotent), the match links in it: the caller flushes.
	 */
	async ensure(names: string[], index?: TopicIndex): Promise<Map<string, Term>> {
		const wanted = new Map<string, string>();
		for (const raw of names) {
			const name = raw.trim();
			const key = termKey(name);
			if (key && !wanted.has(key)) wanted.set(key, name);
		}
		if (!wanted.size) return new Map();
		const added = new Set<string>();
		for (const chunk of _.chunk([...wanted], CHUNK)) {
			const res: { key: string }[] = await this.em.getConnection().execute(
				`insert into terms (key, name) values ${chunk.map(() => '(?, ?)').join(', ')}
				on conflict (key) do nothing returning key`,
				chunk.flat(),
			);
			for (const r of res) added.add(r.key);
		}
		const terms = await this.em.find(
			Term,
			{ key: { $in: [...wanted.keys()] } },
			{ populate: ['topics'] },
		);
		if (added.size) {
			const idx = index ?? (await this.topicService.index());
			const bare = this.bare(idx);
			const now = new Date();
			for (const term of terms) {
				if (!added.has(term.key)) continue;
				const keys = this.matchKeys(bare, term);
				if (keys.length) this.setLinks(term, keys, idx, 'match', now);
			}
		}
		return new Map(terms.map(t => [t.key, t]));
	}

	/**
	 * The topic each of Google's "people often mention" tags names, by title (absent for none): the
	 * wording's decided first topic that is no kind of place, else, for a wording not decided, the
	 * topic it names as a whole in the index (never a kind of place, never split into words:
	 * "cheese counter" is no cheese). Reads only the titles' terms.
	 */
	async reviewTagTopics(titles: string[]): Promise<Map<string, { key: string; label: string }>> {
		const out = new Map<string, { key: string; label: string }>();
		if (!titles.length) return out;
		const keys = [...new Set(titles.map(termKey).filter(Boolean))];
		const [index, terms] = await Promise.all([
			this.topicService.index(),
			this.em.find(
				Term,
				{ key: { $in: keys }, decidedBy: { $ne: null } },
				{ populate: ['topics', 'topics.topic'] },
			),
		]);
		const decided = new Map(
			terms.map(t => [
				t.key,
				t.topics
					.getItems()
					.map(l => l.topic)
					.filter(x => !x.deletedAt)
					.map(x => x.key),
			]),
		);
		const noPlace = (key: string) => index.get(key)?.kind !== TopicKindEnum.FORMAT;
		for (const title of titles) {
			const key = termKey(title);
			const hits = decided.get(key) ?? index.exactAll(title);
			const hit = hits.find(noPlace);
			const topic = hit ? index.get(hit) : undefined;
			if (topic) out.set(title, { key: topic.key, label: topic.label });
		}
		return out;
	}

	/** Wordings still to decide: undecided terms (statements' wordings are stored as they are read; Google's tags by `sync`) */
	async countPending(): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(`select count(*)::int as n from terms where decided_by is null`);
		return row.n;
	}

	/**
	 * Stores the wordings the venues' Google tags carry that have no row yet (a tag as Google writes
	 * it): decided at once by a name match when the wording is a topic's key or label as a whole,
	 * else waiting for the agent. Statements' wordings need no sync: agent B stores them as it reads
	 * (`ensure`). Idempotent. Returns the terms added and matched.
	 */
	async sync(index: TopicIndex): Promise<{ added: number; matched: number }> {
		const conn = this.em.getConnection();
		const tagTitles: { title: string }[] = await conn.execute(
			`select distinct t->>'title' as title from venues v, jsonb_array_elements(v.details->'reviewsTags') t
			where jsonb_exists(v.details, 'reviewsTags') and t->>'title' is not null`,
		);
		const missing = new Map<string, string>();
		for (const { title } of tagTitles) {
			const key = termKey(title);
			if (key && !missing.has(key)) missing.set(key, title);
		}
		const added: { key: string; name: string }[] = [];
		for (const chunk of _.chunk([...missing], CHUNK)) {
			const res: { key: string; name: string }[] = await conn.execute(
				`insert into terms (key, name) values ${chunk.map(() => '(?, ?)').join(', ')}
				on conflict (key) do nothing returning key, name`,
				chunk.flat(),
			);
			added.push(...res);
		}
		const bare = this.bare(index);
		const now = new Date();
		let matched = 0;
		if (added.length) {
			const terms = await this.em.find(
				Term,
				{ key: { $in: added.map(a => a.key) } },
				{ populate: ['topics'] },
			);
			for (const term of terms) {
				const keys = this.matchKeys(bare, term);
				if (!keys.length) continue;
				this.setLinks(term, keys, index, 'match', now);
				matched++;
			}
			await this.em.flush();
		}
		return { added: added.length, matched };
	}

	/**
	 * Decides up to `limit` pending wordings (the most used first; `uses` keeps those used that many
	 * times in claims) with the agent, on `model` when given (a hand-started pass): the topics each
	 * is, or none with a suggestion for a missing topic. Flushes, also when the pool stops on a
	 * provider failure, then rethrows. `usd` is what the paid models charged (0 on the allowance).
	 */
	async decide(opts: {
		limit: number;
		model?: LlmModelChoice;
		uses?: { min?: number; max?: number };
	}): Promise<{ looked: number; linked: number; tokens: number; usd: number }> {
		const index = await this.topicService.index();
		await this.sync(index);
		const uses = 'coalesce(p.n, 0)';
		const ids: { id: number }[] = await this.em.getConnection().execute(
			`select t.id from terms t
			left join (select term_id, count(*) as n from statement_parts group by term_id) p on p.term_id = t.id
			where t.decided_by is null
				${opts.uses?.min !== undefined ? `and ${uses} >= ${Number(opts.uses.min)}` : ''}
				${opts.uses?.max !== undefined ? `and ${uses} <= ${Number(opts.uses.max)}` : ''}
			order by ${uses} desc, t.id
			limit ?`,
			[opts.limit],
		);
		if (!ids.length) return { looked: 0, linked: 0, tokens: 0, usd: 0 };
		const terms = await this.em.find(
			Term,
			{ id: { $in: ids.map(r => r.id) } },
			{ orderBy: { id: 'asc' }, populate: ['topics'] },
		);
		const topics = termTopicInputTopics(index);
		const now = new Date();
		let looked = 0;
		let linked = 0;
		let tokens = 0;
		let usd = 0;
		try {
			await runPool(
				// One wording a call, the topics in the agent's (cached) instructions
				terms,
				CONCURRENCY,
				async term => {
					const res = await this.termTopicAgent.generate(
						termTopicInput(term.name),
						{ topics },
						opts.model ? { model: opts.model } : undefined,
					);
					tokens += res.usage?.totalTokens ?? 0;
					usd += answerUsd(res);
					if (term.decidedBy) return;
					const { keys, relations, suggestion } = termAnswerLinks(res.object, index);
					this.setLinks(term, keys, index, 'ai', now, relations);
					term.suggestion = suggestion;
					looked++;
					if (keys.length) linked++;
				},
				(term, e) => this.logger.warn(`Term ${term.id} failed: ${e.message}`),
			);
		} finally {
			await this.em.flush();
		}
		return { looked, linked, tokens, usd };
	}

	/**
	 * After topics changed (the relink job, first of the re-linkers): new wordings stored, then each
	 * term not an admin's re-decided where the topics moved under it — a wording that is now a topic's
	 * key or label as a whole takes it (over the agent's answer); one whose match is gone, or whose
	 * agent links were all deleted with their topics, waits for the agent again; an agent "none"
	 * takes a topic created since that its suggestion names ("Fries" once Fries exists), drops a
	 * suggestion naming an older one, else waits again when any topic was created after it was
	 * decided. Then every row gets its wording's topic. Pure matching, no LLM.
	 */
	async relink(index: TopicIndex): Promise<Record<string, number>> {
		const synced = await this.sync(index);
		const topics = await this.topicService.all();
		const createdAt = new Map(topics.map(t => [t.key, t.createdAt.getTime()]));
		const newest = _.max(topics.map(t => t.createdAt.getTime())) ?? 0;
		const bare = this.bare(index);
		const terms = await this.em.find(
			Term,
			{ $or: [{ decidedBy: null }, { decidedBy: { $ne: 'admin' } }] },
			{ populate: ['topics', 'topics.topic'] },
		);
		const now = new Date();
		const counts = {
			added: synced.added,
			matched: 0,
			bySuggestion: 0,
			dropped: 0,
			reopened: 0,
		};
		const reopen = (term: Term) => {
			term.topics.removeAll();
			term.decidedBy = null;
			term.decidedAt = null;
			counts.reopened++;
		};
		for (const term of terms) {
			const live = term.topics
				.getItems()
				.filter(l => l.topic && !l.topic.deletedAt)
				.map(l => l.topic.key);
			const matched = this.matchKeys(bare, term);
			if (matched.length) {
				if (term.decidedBy !== 'match' || !_.isEqual(live, matched)) {
					this.setLinks(term, matched, index, 'match', now);
					term.suggestion = null;
					counts.matched++;
				}
				continue;
			}
			if (term.decidedBy === 'match') reopen(term);
			else if (term.decidedBy === 'ai' && term.topics.count()) {
				if (!live.length) reopen(term);
			} else if (term.decidedBy === 'ai') {
				const decidedAt = term.decidedAt?.getTime() ?? 0;
				const suggested = term.suggestion ? bare.exactAll(term.suggestion) : [];
				const created = suggested.length ? createdAt.get(suggested[0]) : undefined;
				if (suggested.length && created !== undefined && created > decidedAt) {
					this.setLinks(term, suggested, index, 'ai', now);
					term.suggestion = null;
					counts.bySuggestion++;
				} else {
					if (suggested.length) {
						term.suggestion = null;
						counts.dropped++;
					}
					if (decidedAt < newest) reopen(term);
				}
			}
		}
		await this.em.flush();
		return counts;
	}

	/**
	 * The city's wordings with their uses there (statements naming it, venues whose Google tags
	 * carry it): a summary, the agent's suggested topics for wordings without one, and the terms the
	 * filters pick, most used first. Stores new wordings first.
	 */
	async list(
		cityId: string,
		filters: {
			status?: TermStatus;
			q?: string;
			topicKey?: string;
			suggestion?: string;
			offset: number;
			limit: number;
		},
	): Promise<TermList> {
		await this.sync(await this.topicService.index());
		const conn = this.em.getConnection();
		const noteRows: { key: string; notes: number }[] = await conn.execute(
			`select t.key, count(*)::int as notes from statement_parts p
			join statements s on s.id = p.statement_id join terms t on t.id = p.term_id
			where p.role = 'food' and s.city_id = ? group by t.key`,
			[cityId],
		);
		const tagRows: { id: string; tags: { title: string }[] }[] = await conn.execute(
			`select id, details->'reviewsTags' as tags from venues where city_id = ? and jsonb_exists(details, 'reviewsTags')`,
			[cityId],
		);
		const tagVenues = new Map<string, number>();
		for (const v of tagRows)
			for (const key of new Set((v.tags ?? []).map(t => termKey(t.title)).filter(Boolean)))
				tagVenues.set(key, (tagVenues.get(key) ?? 0) + 1);
		const notes = new Map(noteRows.map(r => [r.key, r.notes]));
		const keys = [...new Set([...notes.keys(), ...tagVenues.keys()])];
		const terms =
			keys.length ?
				await this.em.find(
					Term,
					{ key: { $in: keys } },
					{ populate: ['topics', 'topics.topic'] },
				)
			:	[];
		const rows = terms.map(t => ({
			id: t.id,
			key: t.key,
			name: t.name,
			topics: t.topics
				.getItems()
				.filter(l => !l.topic.deletedAt)
				.map(l => ({ key: l.topic.key, label: l.topic.label, kind: l.topic.kind })),
			decidedBy: t.decidedBy ?? undefined,
			suggestion: t.suggestion ?? undefined,
			notes: notes.get(t.key) ?? 0,
			tagVenues: tagVenues.get(t.key) ?? 0,
		}));
		const uses = (r: TermListRow) => r.notes + r.tagVenues;
		const sorted = _.sortBy(
			rows,
			r => -uses(r),
			r => r.key,
		);
		const suggestions = _.sortBy(
			Object.values(
				_.groupBy(
					sorted.filter(r => !r.topics.length && r.suggestion && r.decidedBy === 'ai'),
					r => termKey(r.suggestion!),
				),
			).map(group => ({
				label: _.maxBy(
					Object.entries(_.countBy(group, r => r.suggestion!)),
					([, n]) => n,
				)![0],
				terms: group.length,
				uses: _.sumBy(group, uses),
				examples: group.slice(0, EXAMPLES).map(r => r.name),
			})),
			s => -s.uses,
			s => s.label,
		);
		const q = filters.q?.trim().toLowerCase();
		const picked = sorted.filter(r => {
			const status = filters.status ?? 'unlinked';
			if (status === 'linked' && !r.topics.length) return false;
			if (status === 'unlinked' && (r.topics.length || !r.decidedBy)) return false;
			if (status === 'pending' && r.decidedBy) return false;
			if (filters.topicKey && !r.topics.some(t => t.key === filters.topicKey)) return false;
			if (filters.suggestion && termKey(r.suggestion ?? '') !== termKey(filters.suggestion))
				return false;
			return !q || r.name.toLowerCase().includes(q) || r.key.includes(q);
		});
		return {
			summary: {
				terms: rows.length,
				uses: _.sumBy(rows, uses),
				linkedTerms: rows.filter(r => r.topics.length).length,
				linkedUses: _.sumBy(
					rows.filter(r => r.topics.length),
					uses,
				),
				pendingTerms: rows.filter(r => !r.decidedBy).length,
			},
			suggestions,
			total: picked.length,
			terms: picked.slice(filters.offset, filters.offset + filters.limit),
		};
	}

	/**
	 * An admin's decision for a wording: the topics it is (any kind; empty = none), or back to the
	 * name match and the agent. Every statement naming it follows at read time. Flushes.
	 */
	async change(id: number, change: TermChange): Promise<Term> {
		const term = await this.em.findOne(Term, id, { populate: ['topics', 'topics.topic'] });
		if (!term) throw new NotFoundException(`No term ${id}`);
		const index = await this.topicService.index();
		const now = new Date();
		if ('auto' in change) {
			const matched = this.matchKeys(this.bare(index), term);
			this.setLinks(
				term,
				matched,
				index,
				matched.length ? 'match' : null,
				matched.length ? now : null,
			);
		} else {
			const unknown = change.topicKeys.find(k => !index.get(k));
			if (unknown) throw new BadRequestException(`No topic "${unknown}"`);
			this.setLinks(term, _.uniq(change.topicKeys).slice(0, MAX_LINKS), index, 'admin', now);
			term.suggestion = null;
		}
		await this.em.flush();
		await this.em.populate(term, ['topics', 'topics.topic'], { refresh: true });
		return term;
	}

	/**
	 * A topic's other names as an admin keeps them (its "aliases"): the admin terms linked to it
	 * alone, by topic id.
	 */
	async aliasesOf(topicIds: string[]): Promise<Map<string, string[]>> {
		const out = new Map<string, string[]>(topicIds.map(id => [id, []]));
		if (!topicIds.length) return out;
		const rows: { topic_id: string; name: string }[] = await this.em.getConnection().execute(
			`select tt.topic_id, t.name from terms t join term_topics tt on tt.term_id = t.id
			where t.decided_by = 'admin' and tt.topic_id in (${topicIds.map(() => '?').join(', ')})
				and (select count(*) from term_topics x where x.term_id = t.id) = 1
			order by t.name`,
			topicIds,
		);
		for (const r of rows) out.get(r.topic_id)!.push(r.name);
		return out;
	}

	/**
	 * Sets a topic's other names: each becomes an admin term linked to the topic alone (a wording
	 * already an admin's for another topic is refused, 400, since one admin's word stands); an admin
	 * name of the topic not listed any more is reopened, not deleted (a term is never deleted: the
	 * statements' food parts point at it): its link goes and the match and the agent decide it again.
	 * A name that is the topic's own key is dropped. Flushes.
	 */
	async setAliases(topic: Topic, names: string[]): Promise<void> {
		const wanted = new Map<string, string>();
		for (const raw of names) {
			const name = raw.trim();
			const key = termKey(name);
			if (!name || !key || normalizeCuisine(name) === topic.key) continue;
			if (!wanted.has(key)) wanted.set(key, name);
		}
		const current = await this.em.find(
			Term,
			{ decidedBy: 'admin', topics: { topic } },
			{ populate: ['topics', 'topics.topic'] },
		);
		const index = await this.topicService.index();
		const bare = this.bare(index);
		const now = new Date();
		for (const term of current) {
			const alone = term.topics.count() === 1;
			if (alone && !wanted.has(term.key)) {
				const matched = this.matchKeys(bare, term);
				this.setLinks(
					term,
					matched,
					index,
					matched.length ? 'match' : null,
					matched.length ? now : null,
				);
			}
		}
		// A wording that is another topic's key or label as a whole stays that topic's ("Döner" is never ramen's other name)
		for (const [, name] of wanted) {
			const taken = bare.exactAll(name).filter(k => k !== topic.key);
			if (taken.length)
				throw new BadRequestException(`"${name}" already means "${index.label(taken[0])}"`);
		}
		const existing =
			wanted.size ?
				await this.em.find(
					Term,
					{ key: { $in: [...wanted.keys()] } },
					{ populate: ['topics', 'topics.topic'] },
				)
			:	[];
		const byKey = new Map(existing.map(t => [t.key, t]));
		for (const [key, name] of wanted) {
			const term = byKey.get(key);
			if (term?.decidedBy === 'admin') {
				const others = term.topics.getItems().filter(l => l.topic.id !== topic.id);
				if (others.length)
					throw new BadRequestException(
						`"${name}" already means "${others[0].topic.label}"`,
					);
				continue;
			}
			const row = term ?? this.em.create(Term, { key, name });
			this.setLinks(row, [topic.key], index, 'admin', now);
			row.suggestion = null;
		}
		await this.em.flush();
	}

	/** The words an admin dismissed from the unrecognised list: admin terms with no topic, as `normalizeCuisine` keys */
	async ignoredWords(): Promise<string[]> {
		const rows: { name: string }[] = await this.em.getConnection().execute(
			`select t.name from terms t where t.decided_by = 'admin'
				and not exists (select 1 from term_topics tt where tt.term_id = t.id) order by t.name`,
		);
		return _.uniq(rows.map(r => normalizeCuisine(r.name) ?? r.name.trim().toLowerCase()));
	}

	/**
	 * Dismisses a word from the unrecognised list (an admin term with no topic: "no kind of food to
	 * map"), or brings it back (pending again: the match and the agent decide). Idempotent; flushes.
	 */
	async setIgnored(word: string, ignored: boolean): Promise<void> {
		const name = normalizeCuisine(word) ?? word.trim().toLowerCase();
		const key = termKey(name);
		if (!key) return;
		const found: Term | null = await this.em.findOne(Term, { key }, { populate: ['topics'] });
		const term: Term | null = found ?? (ignored ? this.em.create(Term, { key, name }) : null);
		if (!term) return;
		if (ignored) {
			term.topics.removeAll();
			term.decidedBy = 'admin';
			term.decidedAt = new Date();
			term.suggestion = null;
		} else if (term.decidedBy === 'admin' && !term.topics.count()) {
			term.decidedBy = null;
			term.decidedAt = null;
		}
		await this.em.flush();
	}

	/** The topics alone (their keys and labels), for a name match: a wording never matches itself or another term */
	private bare(index: TopicIndex): TopicIndex {
		return new TopicIndex(index.topics);
	}

	/** The topics a wording is as a whole, as spelled or by its key */
	private matchKeys(bare: TopicIndex, term: Term): string[] {
		const hits = bare.exactAll(term.name);
		return hits.length ? hits : bare.exactAll(term.key);
	}

	/**
	 * Sets a term's links to `keys` (in that order) and its decision: a link already there keeps its row
	 * and takes its new rank and relation (a removed-then-added row would hit the term × topic unique
	 * key in one flush), the gone ones are removed, the new ones added. A key without a relation in
	 * `relations` is `same` (a name match, an admin's choice). `term.topics` must be loaded.
	 */
	setLinks(
		term: Term,
		keys: string[],
		index: TopicIndex,
		decidedBy: TermDecider | null,
		at: Date | null,
		relations?: Map<string, TermRelation>,
	) {
		const wanted = keys
			.map(key => ({
				id: index.get(key)?.id,
				relation: relations?.get(key) ?? ('same' as TermRelation),
			}))
			.filter((w): w is { id: string; relation: TermRelation } => !!w.id);
		const ids = wanted.map(w => w.id);
		const current = new Map(term.topics.getItems().map(l => [l.topic.id, l]));
		for (const link of current.values())
			if (!ids.includes(link.topic.id)) term.topics.remove(link);
		wanted.forEach(({ id, relation }, rank) => {
			const link = current.get(id);
			if (link) {
				link.rank = rank;
				link.relation = relation;
			} else
				term.topics.add(
					this.em.create(TermTopic, {
						term,
						topic: this.em.getReference(Topic, id),
						rank,
						relation,
					}),
				);
		});
		term.decidedBy = decidedBy;
		term.decidedAt = at;
	}
}
