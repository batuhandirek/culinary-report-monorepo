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
import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { FoodTopicRelinkService } from 'src/modules/food-topics/services/food-topic-relink.service.js';
import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import { dishKey } from 'src/modules/venues/util/dishes.js';
import { runPool } from 'src/shared/util/pool.js';

import { DishTopicAgent, DishTopicInputName } from '../agents/dish-topic.agent.js';
import { DishName, DishNameDecider } from '../entities/dish-name.entity.js';
import { DishTopics, isDishTopic, matchedTopicId } from '../util/dish-topics.js';

const NAMES_PER_CALL = 100;
const CONCURRENCY = 5;
// Names a daily-backlog batch decides (~5 agent calls)
const BACKLOG_BATCH_NAMES = 500;
const CHUNK = 500;
// The longest suggestion kept: a label, not a sentence
const SUGGESTION_MAX = 60;
const EXAMPLES = 3;

/** Rows an update touched, from `execute(…, 'run')` */
const affected = (result: unknown) => (result as { affectedRows?: number }).affectedRows ?? 0;

/** Which names an admin list shows */
export type DishNameStatus = 'unlinked' | 'linked' | 'pending' | 'all';

/** One name as the admin list shows it, with its rows in the city */
export interface DishNameListRow {
	id: number;
	key: string;
	name: string;
	foodTopic?: { key: string; label: string };
	decidedBy?: DishNameDecider;
	suggestion?: string;
	/** The city's feedback rows naming it */
	notes: number;
}

export interface DishNameList {
	/** The city's names and rows naming a dish, and how many of them point at a topic */
	summary: {
		names: number;
		notes: number;
		linkedNames: number;
		linkedNotes: number;
		pendingNames: number;
	};
	/** The agent's suggested topics for the city's names without one, most noted first */
	suggestions: { label: string; names: number; notes: number; examples: string[] }[];
	/** The names the filters pick, most noted first */
	names: DishNameListRow[];
	total: number;
}

/** What an admin sets on a name: a topic, none (`topicKey` null), or back to the name match and the agent (`auto`) */
export type DishNameChange = { topicKey: string | null } | { auto: true };

/**
 * The dish names the feedback rows carry (`DishName`) and the food topic each is a kind of: the one
 * writer of `dish_names`, and of `feedback_points.food_topic_id`, which copies its name's
 * (`apply`). A name is decided once: by a name match when it is a dish or drink topic or one of
 * its other names, else by `DishTopicAgent` in the daily LLM backlog `feedback-dish-names`, else
 * by an admin, whose choice nothing changes. A topic change re-links through `relink`.
 */
@Injectable()
export class DishNameService implements OnModuleInit {
	private readonly logger = new Logger(DishNameService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly foodTopicRelinkService: FoodTopicRelinkService,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
		private readonly dishTopicAgent: DishTopicAgent,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'feedback-dish-names',
			label: 'Food topics for dish names',
			priority: 25,
			remaining: () => this.countPending(),
			runBatch: async () => {
				const res = await this.decide({ limit: BACKLOG_BATCH_NAMES });
				return { done: res.looked, tokens: res.tokens };
			},
		});
		// A row's food topic follows the topics: re-linked by the one re-link job
		this.foodTopicRelinkService.register({
			key: 'dish-names',
			relink: index => this.relink(index),
		});
	}

	/** What the writers link a new row's dish with: the decided names, read fresh, and the index */
	async dishTopics(): Promise<DishTopics> {
		const index = await this.foodTopicService.index();
		const rows: { key: string; topic: string | null }[] = await this.em
			.getConnection()
			.execute(
				`select key, food_topic_id as topic from dish_names where decided_by is not null`,
			);
		return new DishTopics(index, new Map(rows.map(r => [r.key, r.topic])));
	}

	/** Names still to decide: undecided ones, and the rows' names that have no row yet */
	async countPending(): Promise<number> {
		const [row]: { n: number }[] = await this.em.getConnection().execute(
			`select (select count(*) from dish_names where decided_by is null)
				+ (select count(distinct f.dish_key) from feedback_points f
					where f.dish_key <> '' and not exists (select 1 from dish_names d where d.key = f.dish_key))::int as n`,
		);
		return Number(row.n);
	}

	/**
	 * Stores the names the rows carry that have no row yet, each spelled as its rows spell it most:
	 * decided by a name match when it is a dish or drink topic as a whole, else waiting for the
	 * agent; their rows take the name's topic. Plain SQL, idempotent. Returns the names added and
	 * the rows changed.
	 */
	async sync(index: FoodTopicIndex): Promise<{ added: number; rows: number }> {
		const conn = this.em.getConnection();
		const missing: { key: string; name: string }[] = await conn.execute(
			`select f.dish_key as key, mode() within group (order by f.dish) as name
			from feedback_points f
			where f.dish_key <> '' and not exists (select 1 from dish_names d where d.key = f.dish_key)
			group by f.dish_key`,
		);
		const now = new Date();
		const added: string[] = [];
		for (const chunk of _.chunk(missing, CHUNK)) {
			const res: { key: string }[] = await conn.execute(
				`insert into dish_names (key, name, food_topic_id, decided_by, decided_at)
				values ${chunk.map(() => '(?, ?, ?::uuid, ?, ?::timestamptz)').join(', ')}
				on conflict (key) do nothing
				returning key`,
				chunk.flatMap(m => {
					const topic = matchedTopicId(index, m.name) ?? matchedTopicId(index, m.key);
					return [m.key, m.name, topic, topic ? 'match' : null, topic ? now : null];
				}),
			);
			added.push(...res.map(r => r.key));
		}
		// Their rows follow the name, as written or not
		return { added: added.length, rows: added.length ? await this.apply(added) : 0 };
	}

	/**
	 * Decides up to `limit` undecided names (the most noted first) with the agent, then gives their
	 * rows the topic. A name the agent answers no topic for keeps its suggestion. Flushes, also when
	 * the pool stops on a provider failure, then rethrows.
	 */
	async decide(opts: {
		limit: number;
	}): Promise<{ looked: number; linked: number; tokens: number }> {
		const index = await this.foodTopicService.index();
		await this.sync(index);
		const ids: { id: number }[] = await this.em.getConnection().execute(
			`select d.id from dish_names d
			left join (select dish_key, count(*) as n from feedback_points group by dish_key) f on f.dish_key = d.key
			where d.decided_by is null
			order by coalesce(f.n, 0) desc, d.id
			limit ?`,
			[opts.limit],
		);
		if (!ids.length) return { looked: 0, linked: 0, tokens: 0 };
		const names = await this.em.find(
			DishName,
			{ id: { $in: ids.map(r => r.id) } },
			{ orderBy: { id: 'asc' } },
		);
		const topics = index.topics
			.filter(t => isDishTopic(index, t.key))
			.map(t => ({ key: t.key, label: t.label, also: t.aliases }));
		const byId = new Map(names.map(n => [String(n.id), n]));
		const now = new Date();
		let looked = 0;
		let linked = 0;
		let tokens = 0;
		const decided: string[] = [];
		try {
			await runPool(
				_.chunk(names, NAMES_PER_CALL),
				CONCURRENCY,
				async batch => {
					const input: DishTopicInputName[] = batch.map(n => ({
						id: String(n.id),
						name: n.name,
					}));
					const res = await this.dishTopicAgent.generate(
						JSON.stringify({ topics, names: input }),
					);
					tokens += res.usage?.totalTokens ?? 0;
					for (const answer of res.object.names) {
						const name = byId.get(answer.id);
						if (!name || name.decidedBy) continue;
						// A label answered for a key still counts
						const key =
							answer.topic && index.get(answer.topic) ? answer.topic
							: answer.topic ? index.exact(answer.topic)
							: undefined;
						const topicId = key && isDishTopic(index, key) ? index.get(key)!.id! : null;
						name.foodTopic = topicId ? this.em.getReference(FoodTopic, topicId) : null;
						// A suggestion is a missing topic: one naming a topic the agent passed over is dropped
						const suggestion = answer.newTopic?.trim().slice(0, SUGGESTION_MAX) || null;
						name.suggestion =
							topicId || index.dishTopic(suggestion ?? '') ? null : suggestion;
						name.decidedBy = 'ai';
						name.decidedAt = now;
						decided.push(name.key);
						looked++;
						if (topicId) linked++;
					}
				},
				(batch, e) =>
					this.logger.warn(`Dish name batch of ${batch.length} failed: ${e.message}`),
			);
		} finally {
			await this.em.flush();
			await this.apply(decided);
		}
		return { looked, linked, tokens };
	}

	/**
	 * Gives every feedback row its name's topic (none for an undecided name), or only the rows of
	 * `keys`. Returns the rows changed.
	 */
	async apply(keys?: string[]): Promise<number> {
		const conn = this.em.getConnection();
		const sql = `update feedback_points f set food_topic_id = d.food_topic_id
			from dish_names d
			where d.key = f.dish_key and f.food_topic_id is distinct from d.food_topic_id`;
		if (!keys) return affected(await conn.execute(sql, [], 'run'));
		let updated = 0;
		for (const chunk of _.chunk(_.uniq(keys), CHUNK))
			updated += affected(
				await conn.execute(
					`${sql} and d.key in (${chunk.map(() => '?').join(', ')})`,
					chunk,
					'run',
				),
			);
		return updated;
	}

	/**
	 * After topics changed (the re-link job): new names stored, then each name not an admin's
	 * re-decided where the topics moved under it — a name that is now a topic or one of its other
	 * names takes it (over the agent's answer); one whose match is gone, or whose agent topic is no
	 * dish or drink any more, waits for the agent again; an agent "none" takes a topic created since
	 * that its suggestion names ("Fries" once Fries exists), drops a suggestion naming an older one,
	 * else waits for the agent again when a dish or drink topic was created since. Then every row
	 * gets its name's topic. Pure matching, no LLM.
	 */
	async relink(index: FoodTopicIndex): Promise<Record<string, number>> {
		const synced = await this.sync(index);
		const topics = await this.foodTopicService.all();
		const keyOf = new Map(topics.map(t => [t.id, t.key]));
		const createdAt = new Map(topics.map(t => [t.key, t.createdAt.getTime()]));
		const newest =
			_.max(topics.filter(t => isDishTopic(index, t.key)).map(t => t.createdAt.getTime())) ??
			0;
		const names = await this.em.find(DishName, {
			$or: [{ decidedBy: null }, { decidedBy: { $ne: 'admin' } }],
		});
		const now = new Date();
		const counts = {
			added: synced.added,
			matched: 0,
			bySuggestion: 0,
			dropped: 0,
			reopened: 0,
		};
		const reopen = (name: DishName) => {
			name.foodTopic = null;
			name.decidedBy = null;
			name.decidedAt = null;
			counts.reopened++;
		};
		for (const name of names) {
			const matched = matchedTopicId(index, name.name) ?? matchedTopicId(index, name.key);
			if (matched) {
				if (name.decidedBy !== 'match' || name.foodTopic?.id !== matched) {
					name.foodTopic = this.em.getReference(FoodTopic, matched);
					name.decidedBy = 'match';
					name.decidedAt = now;
					name.suggestion = null;
					counts.matched++;
				}
				continue;
			}
			if (name.decidedBy === 'match') reopen(name);
			else if (name.decidedBy === 'ai' && name.foodTopic) {
				if (!isDishTopic(index, keyOf.get(name.foodTopic.id))) reopen(name);
			} else if (name.decidedBy === 'ai') {
				const decidedAt = name.decidedAt?.getTime() ?? 0;
				const suggested = name.suggestion ? index.dishTopic(name.suggestion) : undefined;
				const created = suggested ? createdAt.get(suggested) : undefined;
				if (suggested && created !== undefined && created > decidedAt) {
					name.foodTopic = this.em.getReference(FoodTopic, index.get(suggested)!.id!);
					name.suggestion = null;
					name.decidedAt = now;
					counts.bySuggestion++;
				} else {
					// A suggestion naming a topic the agent passed over is no missing topic
					if (suggested) {
						name.suggestion = null;
						counts.dropped++;
					}
					if (decidedAt < newest) reopen(name);
				}
			}
		}
		await this.em.flush();
		return { ...counts, rows: synced.rows + (await this.apply()) };
	}

	/**
	 * The city's names, with their rows in the city: a summary, the agent's suggested topics for
	 * names without one, and the names the filters pick, most noted first. Stores new names first.
	 */
	async list(
		cityId: string,
		filters: {
			status?: DishNameStatus;
			q?: string;
			topicKey?: string;
			suggestion?: string;
			offset: number;
			limit: number;
		},
	): Promise<DishNameList> {
		// Names rows got since the last pass are listed too, waiting
		await this.sync(await this.foodTopicService.index());
		const rows: {
			id: number;
			key: string;
			name: string;
			decided_by: DishNameDecider | null;
			suggestion: string | null;
			topic_key: string | null;
			topic_label: string | null;
			notes: number;
		}[] = await this.em.getConnection().execute(
			`select d.id, d.key, d.name, d.decided_by, d.suggestion, t.key as topic_key, t.label as topic_label,
				count(f.id)::int as notes
			from dish_names d
			join feedback_points f on f.dish_key = d.key and f.city_id = ?
			left join food_topics t on t.id = d.food_topic_id
			group by d.id, t.key, t.label`,
			[cityId],
		);
		const sorted = _.sortBy(
			rows,
			r => -r.notes,
			r => r.key,
		);
		const unlinked = sorted.filter(r => !r.topic_key);
		const suggestions = _.sortBy(
			Object.values(
				_.groupBy(
					unlinked.filter(r => r.suggestion && r.decided_by === 'ai'),
					r => dishKey(r.suggestion!),
				),
			).map(group => ({
				label: _.maxBy(
					Object.entries(_.countBy(group, r => r.suggestion!)),
					([, n]) => n,
				)![0],
				names: group.length,
				notes: _.sumBy(group, r => r.notes),
				examples: group.slice(0, EXAMPLES).map(r => r.name),
			})),
			s => -s.notes,
			s => s.label,
		);
		const q = filters.q?.trim().toLowerCase();
		const picked = sorted.filter(r => {
			const status = filters.status ?? 'unlinked';
			if (status === 'linked' && !r.topic_key) return false;
			if (status === 'unlinked' && (r.topic_key || !r.decided_by)) return false;
			if (status === 'pending' && r.decided_by) return false;
			if (filters.topicKey && r.topic_key !== filters.topicKey) return false;
			if (filters.suggestion && dishKey(r.suggestion ?? '') !== dishKey(filters.suggestion))
				return false;
			return !q || r.name.toLowerCase().includes(q) || r.key.includes(q);
		});
		return {
			summary: {
				names: rows.length,
				notes: _.sumBy(rows, r => r.notes),
				linkedNames: rows.filter(r => r.topic_key).length,
				linkedNotes: _.sumBy(
					rows.filter(r => r.topic_key),
					r => r.notes,
				),
				pendingNames: rows.filter(r => !r.decided_by).length,
			},
			suggestions,
			total: picked.length,
			names: picked.slice(filters.offset, filters.offset + filters.limit).map(r => ({
				id: r.id,
				key: r.key,
				name: r.name,
				...(r.topic_key && {
					foodTopic: { key: r.topic_key, label: r.topic_label ?? r.topic_key },
				}),
				...(r.decided_by && { decidedBy: r.decided_by }),
				...(r.suggestion && { suggestion: r.suggestion }),
				notes: r.notes,
			})),
		};
	}

	/**
	 * An admin's choice for a name: a dish or drink topic (400 for another), none, or back to the
	 * name match and the agent. Its rows follow at once. Flushes.
	 */
	async change(id: number, change: DishNameChange): Promise<DishName> {
		const name = await this.em.findOne(DishName, id, { populate: ['foodTopic'] });
		if (!name) throw new NotFoundException(`No dish name ${id}`);
		const index = await this.foodTopicService.index();
		const now = new Date();
		if ('auto' in change) {
			const matched = matchedTopicId(index, name.name) ?? matchedTopicId(index, name.key);
			name.foodTopic = matched ? this.em.getReference(FoodTopic, matched) : null;
			name.decidedBy = matched ? 'match' : null;
			name.decidedAt = matched ? now : null;
		} else {
			if (change.topicKey !== null && !isDishTopic(index, change.topicKey))
				throw new BadRequestException(`No dish or drink topic "${change.topicKey}"`);
			name.foodTopic =
				change.topicKey ?
					this.em.getReference(FoodTopic, index.get(change.topicKey)!.id!)
				:	null;
			name.decidedBy = 'admin';
			name.decidedAt = now;
		}
		await this.em.flush();
		await this.apply([name.key]);
		await this.em.populate(name, ['foodTopic'], { refresh: true });
		return name;
	}
}
