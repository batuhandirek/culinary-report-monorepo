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
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import { EmbeddingsService } from 'src/modules/llm/services/embeddings.service.js';
import { answerUsd } from 'src/modules/llm/util/llm-cost.js';
import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { termKey } from 'src/modules/venues/util/dishes.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';
import { runPool } from 'src/shared/util/pool.js';

import { TermTopicAgent } from '../agents/term-topic.agent.js';
import {
	defaultEdgeType,
	type EdgeType,
	MIN_TOPIC_SOURCES,
	MIN_TOPIC_USES,
	PROMOTION_KINDS,
	TOPIC_EMBEDDING_DIMENSIONS,
} from '../constants/topic-edge.constant.js';
import { Term, TermDecider } from '../entities/term.entity.js';
import { TermModifier } from '../entities/term-modifier.entity.js';
import { Topic, TopicKindEnum } from '../entities/topic.entity.js';
import {
	NO_TOPIC,
	type TermDecision,
	termDecisionOf,
	termTopicInputTopics,
	termTopicMessage,
} from '../util/term-topic-input.js';
import { TopicIndex } from '../util/topics.js';
import { groupTwins, twinKeys } from '../util/twin-labels.js';

import { topicKeyOf,TopicService } from './topic.service.js';
import { TopicRelinkService } from './topic-relink.service.js';

// Wordings read side by side, one a call
const CONCURRENCY = 10;
// Wordings a daily-backlog batch decides
const BACKLOG_BATCH_TERMS = 500;
const CHUNK = 500;
const MAX_MODIFIERS = 5;

/** Which terms an admin list shows */
/** `linked`: with a main topic or a modifier (a topic page's wordings); `all`: every wording, decided or not */
export type TermStatus = 'linked' | 'all';

export interface TermListTopic {
	key: string;
	label: string;
	kind: string;
}

export interface TermListRow {
	id: number;
	key: string;
	name: string;
	/** Its main topic; absent for none or not decided */
	topic?: TermListTopic;
	/** True: a synonym of `topic`; false: something narrower under it */
	exact: boolean;
	/** What a narrower wording is or has beside its main topic */
	modifiers: (TermListTopic & { type: EdgeType })[];
	proposedLabel?: string;
	proposedKind?: string;
	decidedBy?: TermDecider;
	/** The city's statements naming it (food parts) */
	notes: number;
	/** The city's venues whose Google tags carry it */
	tagVenues: number;
}

export interface TermList {
	terms: TermListRow[];
	total: number;
}

/**
 * An admin's decision on a term: its main topic (null = none), whether the wording is that topic
 * (`exact`, the default with a topic and no modifiers) and what else a narrower one is or has; or
 * back to the name match and the agent
 */
export type TermChange =
	| { topicKey: string | null; exact?: boolean; modifiers?: { topicKey: string; type?: EdgeType }[] }
	| { auto: true };

export interface PromotionResult {
	/** New topics created, by label */
	created: string[];
	/** Wordings moved onto a topic of their own (new or existing) */
	moved: number;
}

/** A wording promotion reads: a decided narrower wording with its uses */
interface Candidate {
	id: number;
	name: string;
	proposedLabel: string | null;
	proposedKind: TopicKindEnum | null;
	/** It sits under a main topic */
	hasTopic: boolean;
	uses: number;
	sources: number;
}

/**
 * Every wording ever seen (`Term`) with its main topic and modifiers (`TermModifier`): the one
 * writer of both. A statement's food parts point at terms and take their topic at read time, so a
 * decision here moves every statement at once. A wording is decided once: by a name match when it
 * is a topic's key or label as a whole (`match`, against the topics alone, never against other
 * terms), else by `TermTopicAgent` in the daily LLM backlog `terms` (offered the fixed kinds and
 * the topics closest to it), else by an admin (`admin`, never changed by anything else). Narrower
 * wordings used enough become topics of their own in code (`promote`). Decided terms are part of
 * `TopicIndex` (`TopicService.index`), so a decision reaches Google categories, delivery menus,
 * hashtags and Google's tags through the relink job, whose re-linker `terms` runs first; claims
 * (and so what a post's mention is about) read the term at once.
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
		private readonly embeddingsService: EmbeddingsService,
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
	 * The terms of the wordings given (agent A's food wordings), stored when missing, each spelled
	 * as first seen: a new one is decided at once by a name match when it is a topic's key or label
	 * as a whole, else waits for the `terms` backlog. By `termKey`; empty keys dropped. Inserts
	 * outside the unit of work (idempotent), the match in it: the caller flushes.
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
			{ populate: ['modifiers'] },
		);
		if (added.size) {
			const idx = index ?? (await this.topicService.index());
			const bare = this.bare(idx);
			const now = new Date();
			for (const term of terms) {
				if (!added.has(term.key)) continue;
				const key = this.matchKey(bare, term);
				if (key) this.setDecision(term, { ...NO_TOPIC, topicKey: key, exact: true }, idx, 'match', now);
			}
		}
		return new Map(terms.map(t => [t.key, t]));
	}

	/**
	 * The topic each of Google's "people often mention" tags names, by title (absent for none): the
	 * decided wording's main topic, else its first modifier, that is no kind of place; else, for a
	 * wording not decided, the topic it names as a whole in the index (never a kind of place, never
	 * split into words: "cheese counter" is no cheese). Reads only the titles' terms.
	 */
	async reviewTagTopics(titles: string[]): Promise<Map<string, { key: string; label: string }>> {
		const out = new Map<string, { key: string; label: string }>();
		if (!titles.length) return out;
		const keys = [...new Set(titles.map(termKey).filter(Boolean))];
		const index = await this.topicService.index();
		const terms = await this.em.find(
			Term,
			{ key: { $in: keys }, decidedBy: { $ne: null } },
			{ populate: ['topic', 'modifiers', 'modifiers.topic'] },
		);
		const decided = new Map(
			terms.map(t => [
				t.key,
				[t.topic, ...t.modifiers.getItems().map(m => m.topic)]
					.filter((x): x is Topic => !!x && !x.deletedAt)
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
	 * Stores the wordings that have no row yet, as written: the venues' Google tags, and a food
	 * venue's Google category the index resolves to nothing ("Serbian restaurant"), so the agent
	 * decides them like any wording, and once decided they resolve through the index. Each is decided at once by a name match when it is a topic's key
	 * or label as a whole, else waits for the agent. Statements' wordings need no sync: the labelling
	 * pass stores them as it reads (`ensure`). Idempotent. Returns the terms added and matched.
	 */
	async sync(index: TopicIndex): Promise<{ added: number; matched: number }> {
		const conn = this.em.getConnection();
		const tagTitles = await conn.execute<{ title: string }[]>(
			`select distinct t->>'title' as title from venues v, jsonb_array_elements(v.details->'reviewsTags') t
				where jsonb_exists(v.details, 'reviewsTags') and t->>'title' is not null`,
		);
		const categories = await conn.execute<{ category: string }[]>(
			`select distinct category from venues where category is not null`,
		);
		const missing = new Map<string, string>();
		const add = (name: string) => {
			const key = termKey(name);
			if (key && !missing.has(key)) missing.set(key, name.trim());
		};
		for (const { title } of tagTitles) add(title);
		for (const { category } of categories) {
			// A hotel or a dance school a scrape found is no kind of food; "Restaurant" alone says nothing
			if (!isFoodVenue(category)) continue;
			if (normalizeCuisine(category) && !index.resolve(category).length) add(category);
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
				{ populate: ['modifiers'] },
			);
			for (const term of terms) {
				const key = this.matchKey(bare, term);
				if (!key) continue;
				this.setDecision(term, { ...NO_TOPIC, topicKey: key, exact: true }, index, 'match', now);
				matched++;
			}
			await this.em.flush();
		}
		return { added: added.length, matched };
	}

	/**
	 * Decides up to `limit` pending wordings (the most used first; `uses` keeps those used that many
	 * times in claims) with the agent, on `model` when given (a hand-started pass): each is offered
	 * the fixed kinds and the topics closest to its vector (every topic when the embeddings account
	 * is out) and answered as its topic, a narrower thing under one, or none. Flushes, also when the
	 * pool stops on a provider failure, then rethrows; then promotes the narrower wordings that
	 * reached the floor. `usd` is what the paid models charged (0 on the allowance).
	 */
	async decide(opts: {
		limit: number;
		model?: LlmModelChoice;
		uses?: { min?: number; max?: number };
	}): Promise<{ looked: number; linked: number; tokens: number; usd: number; promoted: PromotionResult }> {
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
		const none = { created: [], moved: 0 };
		if (!ids.length) return { looked: 0, linked: 0, tokens: 0, usd: 0, promoted: none };
		const terms = await this.em.find(
			Term,
			{ id: { $in: ids.map(r => r.id) } },
			{ orderBy: { id: 'asc' }, populate: ['modifiers'] },
		);
		const fixed = termTopicInputTopics(index);
		const vectors = await this.topicService.vectors();
		const wordings = vectors ? await this.wordingVectors(terms.map(t => t.name)) : null;
		const now = new Date();
		let looked = 0;
		let linked = 0;
		let tokens = 0;
		let usd = 0;
		try {
			await runPool(
				// One wording a call: the fixed topics in the agent's (cached) instructions, the close ones in the message
				terms.map((term, i) => ({ term, vector: wordings?.[i] })),
				CONCURRENCY,
				async ({ term, vector }) => {
					const res = await this.termTopicAgent.generate(
						termTopicMessage(term.name, index, vector, vectors),
						{ topics: fixed },
						opts.model ? { model: opts.model } : undefined,
					);
					tokens += res.usage?.totalTokens ?? 0;
					usd += answerUsd(res);
					if (term.decidedBy) return;
					const decision = termDecisionOf(res.object, index);
					this.setDecision(term, decision, index, 'ai', now);
					looked++;
					if (decision.topicKey) linked++;
				},
				({ term }, e) => this.logger.warn(`Term ${term.id} failed: ${e.message}`),
			);
		} finally {
			await this.em.flush();
		}
		const promoted = await this.promote();
		return { looked, linked, tokens, usd, promoted };
	}

	/** The wordings' vectors, in order; null when the embeddings account can't serve (every topic is then offered) */
	private async wordingVectors(names: string[]): Promise<number[][] | null> {
		try {
			const out: number[][] = [];
			for (const chunk of _.chunk(names, CHUNK)) {
				const res = await this.embeddingsService.embedMany(chunk, {
					dimensions: TOPIC_EMBEDDING_DIMENSIONS,
				});
				out.push(...res.embeddings);
			}
			return out.length === names.length ? out : null;
		} catch (e) {
			this.logger.warn(`Wordings not embedded: ${(e as Error).message}`);
			return null;
		}
	}

	/**
	 * Promotion, in code, no LLM: narrower wordings (decided, not exact, under no aspect) grouped by
	 * the label they would carry as a topic (`proposedLabel`, else the wording), twins together
	 * (`groupTwins`: folded, words run together or in another order), so every spelling of one thing
	 * is one group. A group whose label, or a wording's name, is a topic or its twin already moves
	 * onto it, never a twin. Otherwise, once the group's uses reach `MIN_TOPIC_USES` from
	 * `MIN_TOPIC_SOURCES` sources (`force` skips the floor for the given term's group: an admin's
	 * "make it a topic of its own"), its topic is created through `TopicService.create`: labelled as
	 * its most used wording proposes, of the group's most common proposed kind, with every `is_a`
	 * its wordings carry (what a thing is doesn't change with its spelling; the most used wording's
	 * main topic first, the display parent) and only the `has` most of its uses carry (the rest
	 * describe single orders and stay on their wordings). Then the group's wordings move onto it:
	 * every one the agent decided, an admin's only when the topic's edges cover all it said;
	 * `exact` when nothing of the wording is left beyond what the topic states, else the rest stays
	 * as its modifiers. Queues one re-link when it created topics.
	 */
	async promote(opts: { force?: { termId: number; label?: string; kind?: TopicKindEnum } } = {}): Promise<PromotionResult> {
		const result: PromotionResult = { created: [], moved: 0 };
		const rows: Candidate[] = await this.em.getConnection().execute(
			`select t.id, t.name, t.proposed_label as "proposedLabel", t.proposed_kind as "proposedKind",
				(t.topic_id is not null) as "hasTopic", coalesce(u.uses, 0)::int as uses, coalesce(u.sources, 0)::int as sources
			from terms t
			left join topics x on x.id = t.topic_id
			left join (
				select sp.term_id, count(*)::int as uses,
					count(distinct coalesce(s.review_id::text, s.post_id::text, s.comment_id::text, s.web_mention_id::text))::int as sources
				from statement_parts sp join statements s on s.id = sp.statement_id
				where sp.role = 'food' group by sp.term_id
			) u on u.term_id = t.id
			where t.decided_by is not null and t.exact = false
				and (x.id is null or x.kind <> 'aspect')
				and (t.topic_id is not null or t.proposed_label is not null
					or exists (select 1 from term_modifiers tm where tm.term_id = t.id))`,
		);
		const forced = opts.force ? rows.find(r => r.id === opts.force!.termId) : undefined;
		if (opts.force && !forced) return result;
		const nameOf = (r: Candidate) => r.proposedLabel ?? r.name;
		const groups = groupTwins(rows, nameOf)
			.filter(group => !forced || group.includes(forced))
			.map(group => _.orderBy(group, [r => r.uses, r => r.id], ['desc', 'asc']));
		let index = await this.topicService.index();
		let bare = this.bare(index);
		// Every food topic by the twin keys of its label and key ("Hot dogs" is "hotdog" too)
		const twinsOf = (idx: TopicIndex) => {
			const out = new Map<string, string>();
			for (const t of idx.food)
				for (const k of [...twinKeys(t.label), ...twinKeys(t.key)]) if (!out.has(k)) out.set(k, t.key);
			return out;
		};
		let twins = twinsOf(index);
		const food = (key: string | null | undefined) => {
			const topic = key ? index.get(key) : undefined;
			return topic && topic.kind !== TopicKindEnum.ASPECT ? topic.key : null;
		};
		for (const group of _.orderBy(groups, g => -_.sumBy(g, r => r.uses))) {
			const most = forced ?? group[0];
			const label = (opts.force?.label ?? most.proposedLabel ?? capitalize(most.name)).trim();
			const kinds = _.countBy(
				group.filter(r => r.proposedKind),
				r => r.proposedKind!,
			);
			const proposedKind = _.maxBy(Object.entries(kinds), ([, n]) => n)?.[0] as
				TopicKindEnum | undefined;
			// A label that is a topic already (its key or label, what its key would be, or a twin of one
			// of them or of a wording's name): never a twin, and no floor, since nothing is created
			let target =
				food(bare.exact(label)) ??
				food(topicKeyOf(label, proposedKind ?? TopicKindEnum.DISH)) ??
				food(
					[label, ...group.map(nameOf)]
						.flatMap(twinKeys)
						.map(k => twins.get(k))
						.find(Boolean),
				);
			const uses = _.sumBy(group, r => r.uses);
			const sources = _.sumBy(group, r => r.sources);
			if (!target && !forced && (uses < MIN_TOPIC_USES || sources < MIN_TOPIC_SOURCES)) continue;
			// A label alone (the old agent's suggestion for a wording under no topic) says neither what
			// kind of thing it is nor where it sits: it joins a topic of that name, but creates none
			if (!target && !forced && !group.some(r => r.proposedKind || r.hasTopic)) continue;
			const terms = await this.em.find(
				Term,
				{ id: { $in: group.map(r => r.id) } },
				{ populate: ['topic', 'modifiers', 'modifiers.topic'] },
			);
			const usesOf = new Map(group.map(r => [r.id, r.uses]));
			if (!target) {
				const carried = (type: EdgeType) => {
					const by = new Map<string, number>();
					for (const term of _.orderBy(terms, t => (t.id === most.id ? -1 : 0))) {
						const keys = [
							...(type === 'is_a' && term.topic ? [term.topic.key] : []),
							...term.modifiers
								.getItems()
								.filter(m => m.type === type)
								.map(m => m.topic.key),
						];
						for (const key of keys)
							if (food(key)) by.set(key, (by.get(key) ?? 0) + (usesOf.get(term.id) ?? 0));
					}
					return by;
				};
				const isA = [...carried('is_a').keys()];
				const has = [...carried('has')].filter(([, n]) => n * 2 > uses).map(([key]) => key);
				const kind =
					opts.force?.kind ??
					proposedKind ??
					isA
						.map(key => index.get(key)!.kind)
						.find(k =>
							[TopicKindEnum.DISH, TopicKindEnum.DRINK, TopicKindEnum.INGREDIENT].includes(k),
						) ??
					TopicKindEnum.DISH;
				try {
					const topic = await this.topicService.create(
						{
							label,
							kind: (PROMOTION_KINDS as readonly TopicKindEnum[]).includes(kind) ? kind : TopicKindEnum.DISH,
							edges: [
								...isA.map(to => ({ to, type: 'is_a' as const })),
								...has.filter(to => !isA.includes(to)).map(to => ({ to, type: 'has' as const })),
							],
							discovered: true,
						},
						{ relink: false, by: forced ? 'admin' : 'ai' },
					);
					result.created.push(topic.label);
					target = topic.key;
					index = await this.topicService.index();
					bare = this.bare(index);
					twins = twinsOf(index);
				} catch (e) {
					this.logger.warn(`Promotion could not create "${label}": ${(e as Error).message}`);
					continue;
				}
			}
			// What the topic states already, by walking its edges: a wording keeps only what is beyond it
			const isA = new Set(index.ancestors([target], { strict: true }));
			const any = new Set(index.ancestors([target]));
			const now = new Date();
			for (const term of terms) {
				const said = [
					...(term.topic && term.topic.key !== target ?
						[{ topicKey: term.topic.key, type: 'is_a' as EdgeType }]
					:	[]),
					...term.modifiers.getItems().map(m => ({ topicKey: m.topic.key, type: m.type })),
				];
				const rest = said.filter(m => !(m.type === 'is_a' ? isA : any).has(m.topicKey));
				const mine = forced && term.id === forced.id;
				if (term.decidedBy === 'admin' && rest.length && !mine) continue;
				this.setDecision(
					term,
					{
						topicKey: target,
						exact: !rest.length || !!mine,
						proposedLabel: null,
						proposedKind: null,
						modifiers: mine ? [] : rest.slice(0, MAX_MODIFIERS),
					},
					index,
					mine ? 'admin' : (term.decidedBy ?? 'ai'),
					mine ? now : (term.decidedAt ?? now),
				);
				result.moved++;
			}
			await this.em.flush();
		}
		if (result.created.length) await this.topicService.queueRelink();
		if (result.created.length || result.moved)
			this.logger.log(
				`Promotion: ${result.created.length} topics created (${result.created.join(', ')}), ${result.moved} wordings moved`,
			);
		return result;
	}

	/**
	 * After topics changed (the relink job, first of the re-linkers): new wordings stored, then each
	 * term not an admin's re-decided where the topics moved under it — a wording that is now a topic's
	 * key or label as a whole is that topic, exact (over the agent's answer); one whose match is gone
	 * waits for the agent again. Then promotion, which also moves a narrower wording onto a topic
	 * created since that its label names. Pure matching, no LLM.
	 */
	async relink(index: TopicIndex): Promise<Record<string, number>> {
		const synced = await this.sync(index);
		const bare = this.bare(index);
		const terms = await this.em.find(
			Term,
			{ $or: [{ decidedBy: null }, { decidedBy: { $ne: 'admin' } }] },
			{ populate: ['topic', 'modifiers'] },
		);
		const now = new Date();
		const counts = { added: synced.added, matched: 0, reopened: 0, promoted: 0, moved: 0 };
		for (const term of terms) {
			const matched = this.matchKey(bare, term);
			if (matched) {
				if (term.decidedBy !== 'match' || term.topic?.key !== matched || !term.exact) {
					this.setDecision(term, { ...NO_TOPIC, topicKey: matched, exact: true }, index, 'match', now);
					counts.matched++;
				}
			} else if (term.decidedBy === 'match') {
				this.setDecision(term, NO_TOPIC, index, null, null);
				counts.reopened++;
			}
		}
		await this.em.flush();
		const promoted = await this.promote();
		counts.promoted = promoted.created.length;
		counts.moved = promoted.moved;
		return counts;
	}

	/**
	 * The city's wordings with their uses there (statements naming it, venues whose Google tags
	 * carry it) that the filters pick, most used first: a topic page's wordings (`linked` with its
	 * `topicKey`) and its search for another (`all` with `q`). Stores new wordings first.
	 */
	async list(
		cityId: string,
		filters: {
			status?: TermStatus;
			q?: string;
			topicKey?: string;
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
		const terms: Term[] = [];
		for (const chunk of _.chunk(keys, 5000))
			terms.push(
				...(await this.em.find(
					Term,
					{ key: { $in: chunk } },
					{ populate: ['topic', 'modifiers', 'modifiers.topic'] },
				)),
			);
		const rows = terms.map(t => ({
			...termRow(t),
			notes: notes.get(t.key) ?? 0,
			tagVenues: tagVenues.get(t.key) ?? 0,
		}));
		const uses = (r: TermListRow) => r.notes + r.tagVenues;
		const linked = (r: TermListRow) => !!r.topic || r.modifiers.length > 0;
		const sorted = _.sortBy(
			rows,
			r => -uses(r),
			r => r.key,
		);
		const q = filters.q?.trim().toLowerCase();
		const picked = sorted.filter(r => {
			if (filters.status === 'linked' && !linked(r)) return false;
			if (
				filters.topicKey &&
				r.topic?.key !== filters.topicKey &&
				!r.modifiers.some(m => m.key === filters.topicKey)
			)
				return false;
			return !q || r.name.toLowerCase().includes(q) || r.key.includes(q);
		});
		return {
			total: picked.length,
			terms: picked.slice(filters.offset, filters.offset + filters.limit),
		};
	}

	/**
	 * An admin's decision for a wording: its main topic (any kind; null = none), whether it is that
	 * topic and what else a narrower one is or has, or back to the name match and the agent. Every
	 * statement naming it follows at read time. A wording under an aspect is exact, with no
	 * modifiers; an exact one has none (400 when given). Flushes.
	 */
	async change(id: number, change: TermChange): Promise<Term> {
		const term = await this.em.findOne(Term, id, { populate: ['modifiers'] });
		if (!term) throw new NotFoundException(`No term ${id}`);
		const index = await this.topicService.index();
		const now = new Date();
		if ('auto' in change) {
			const matched = this.matchKey(this.bare(index), term);
			if (matched)
				this.setDecision(term, { ...NO_TOPIC, topicKey: matched, exact: true }, index, 'match', now);
			else this.setDecision(term, NO_TOPIC, index, null, null);
		} else {
			const topic = change.topicKey ? index.get(change.topicKey) : undefined;
			if (change.topicKey && !topic) throw new BadRequestException(`No topic "${change.topicKey}"`);
			const given = _.uniqBy(change.modifiers ?? [], m => m.topicKey).filter(
				m => m.topicKey !== change.topicKey,
			);
			const modifiers = given.map(m => {
				const to = index.get(m.topicKey);
				if (!to) throw new BadRequestException(`No topic "${m.topicKey}"`);
				if (to.kind === TopicKindEnum.ASPECT)
					throw new BadRequestException(`"${to.label}" is an aspect: a wording is under one aspect, nothing else`);
				return { topicKey: to.key, type: m.type ?? defaultEdgeType(to.kind) };
			});
			if (modifiers.length > MAX_MODIFIERS)
				throw new BadRequestException(`A wording has ${MAX_MODIFIERS} modifiers at most`);
			const aspect = topic?.kind === TopicKindEnum.ASPECT;
			const exact = aspect || (change.exact ?? (!!topic && !modifiers.length));
			if (exact && !topic) throw new BadRequestException('An exact wording needs its topic');
			if (exact && modifiers.length)
				throw new BadRequestException(
					aspect ?
						`"${topic!.label}" is an aspect: a wording under it has no modifiers`
					:	'An exact wording has no modifiers: what its topic is and has is stated on the topic',
				);
			this.setDecision(
				term,
				{
					topicKey: topic?.key ?? null,
					exact,
					// A narrower wording keeps what the agent proposed it as, so promotion still groups it
					proposedLabel: exact ? null : (term.proposedLabel ?? null),
					proposedKind: exact ? null : (term.proposedKind ?? null),
					modifiers,
				},
				index,
				'admin',
				now,
			);
		}
		await this.em.flush();
		// What resolves text through the index (Google categories, menus, hashtags, venue tags) learns
		// the decision from the re-link; statements read the term at once
		await this.topicService.queueRelink();
		await this.em.populate(term, ['topic', 'modifiers', 'modifiers.topic'], { refresh: true });
		return term;
	}

	/**
	 * An admin's "make it a topic of its own": the wording's promotion group becomes a topic now,
	 * whatever its uses (`label` and `kind` override what the agent proposed), and the wording is
	 * that topic, exact, by the admin's word. 400 for a wording that is exact already or under an
	 * aspect.
	 */
	async promoteTerm(id: number, input: { label?: string; kind?: TopicKindEnum } = {}): Promise<Term> {
		const term = await this.em.findOne(Term, id, { populate: ['topic', 'modifiers'] });
		if (!term) throw new NotFoundException(`No term ${id}`);
		if (term.topic?.kind === TopicKindEnum.ASPECT)
			throw new BadRequestException(`"${term.name}" is under an aspect: aspects are added on the Aspects page`);
		// An exact synonym, a "none" or a wording not decided yet becomes a narrower one first, so promotion takes it
		if (term.exact || !term.decidedBy || (!term.topic && !term.proposedLabel && !term.modifiers.count())) {
			term.exact = false;
			term.proposedLabel = input.label?.trim() || term.proposedLabel || capitalize(term.name);
			term.decidedBy = 'admin';
			term.decidedAt = new Date();
			await this.em.flush();
		}
		const promoted = await this.promote({ force: { termId: term.id, ...input } });
		if (!promoted.moved)
			throw new BadRequestException(`"${term.name}" could not be made a topic: its label names no kind of food`);
		await this.em.populate(term, ['topic', 'modifiers', 'modifiers.topic'], { refresh: true });
		return term;
	}

	/** The topics alone (their keys and labels), for a name match: a wording never matches itself or another term */
	private bare(index: TopicIndex): TopicIndex {
		return new TopicIndex(index.topics);
	}

	/** The topic a wording is as a whole, as spelled or by its key */
	private matchKey(bare: TopicIndex, term: Term): string | undefined {
		return bare.exact(term.name) ?? bare.exact(term.key);
	}

	/**
	 * Sets a term's decision: its main topic, `exact`, the proposal and its modifiers (in that
	 * order). A modifier already there keeps its row and takes its new type and rank (a
	 * removed-then-added row would hit the term × topic key in one flush), the gone ones are removed,
	 * the new ones added. Unknown keys are dropped. `term.modifiers` must be loaded.
	 */
	setDecision(
		term: Term,
		decision: TermDecision,
		index: TopicIndex,
		decidedBy: TermDecider | null,
		at: Date | null,
	) {
		const topicId = decision.topicKey ? index.get(decision.topicKey)?.id : undefined;
		term.topic = topicId ? this.em.getReference(Topic, topicId) : null;
		term.exact = !!topicId && decision.exact;
		term.proposedLabel = term.exact ? null : decision.proposedLabel;
		term.proposedKind = term.exact ? null : decision.proposedKind;
		const wanted =
			term.exact ?
				[]
			:	decision.modifiers
					.map(m => ({ id: index.get(m.topicKey)?.id, type: m.type }))
					.filter((w): w is { id: string; type: EdgeType } => !!w.id && w.id !== topicId);
		const ids = wanted.map(w => w.id);
		const current = new Map(term.modifiers.getItems().map(m => [m.topic.id, m]));
		for (const modifier of current.values())
			if (!ids.includes(modifier.topic.id)) term.modifiers.remove(modifier);
		wanted.forEach(({ id, type }, rank) => {
			const modifier = current.get(id);
			if (modifier) {
				modifier.rank = rank;
				modifier.type = type;
			} else
				term.modifiers.add(
					this.em.create(TermModifier, {
						term,
						topic: this.em.getReference(Topic, id),
						type,
						rank,
					}),
				);
		});
		term.decidedBy = decidedBy;
		term.decidedAt = at;
	}
}

const capitalize = (name: string): string => {
	const trimmed = name.trim();
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/** A term as the admin list and the admin routes answer it (`topic` and `modifiers.topic` loaded), without its uses */
export const termRow = (t: Term): Omit<TermListRow, 'notes' | 'tagVenues'> => {
	const topic = (x: Topic) => ({ key: x.key, label: x.label, kind: x.kind });
	return {
		id: t.id,
		key: t.key,
		name: t.name,
		...(t.topic && !t.topic.deletedAt && { topic: topic(t.topic) }),
		exact: t.exact,
		modifiers: t.modifiers
			.getItems()
			.filter(m => !m.topic.deletedAt)
			.map(m => ({ ...topic(m.topic), type: m.type })),
		...(t.proposedLabel && { proposedLabel: t.proposedLabel }),
		...(t.proposedKind && { proposedKind: t.proposedKind }),
		...(t.decidedBy && { decidedBy: t.decidedBy }),
	};
};
