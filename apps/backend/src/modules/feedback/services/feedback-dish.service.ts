import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { dishKey, namesDish } from 'src/modules/venues/util/dishes.js';
import { runPool } from 'src/shared/util/pool.js';

import { FeedbackDishAgent, FeedbackDishInputPoint } from '../agents/feedback-dish.agent.js';
import { FeedbackPoint } from '../entities/feedback-point.entity.js';
import { DISH_TOPICS } from '../util/feedback-rows.js';

import { FeedbackService } from './feedback.service.js';

const POINTS_PER_CALL = 40;
const CONCURRENCY = 5;
// Points a daily-backlog batch looks at (~10 agent calls)
const BACKLOG_BATCH_POINTS = 400;
// A point checked this long after it was stored got its dish from the pass, not with the point
const PASS_AFTER_MS = 60_000;

/** SQL: a food or drinks point (`f`) whose dish nobody decided yet */
export const DISH_PENDING_SQL = `f.detail is not null and not f.change and f.dish is null and f.dish_checked_at is null and f.topic in (${DISH_TOPICS.map(t => `'${t}'`).join(', ')})`;

const sourceOf = (row: {
	review?: unknown;
	mention?: unknown;
	reviewId?: string | null;
	mentionId?: number | null;
}) => (row.reviewId ? `r:${row.reviewId}` : `m:${row.mentionId}`);

/**
 * Links stored food and drinks points to the dish they are about, among the dishes their source
 * names (`FeedbackDishAgent`), for points the phrase alone couldn't link: stored before points had
 * a dish. A point is looked at once (`dishCheckedAt`, also when it names none); a source naming no
 * dish needs no call. Linking a point drops the source's dish-only row of that dish: a dish a point
 * names is no dish-only row. A daily LLM backlog (`feedback-dish-links`).
 */
@Injectable()
export class FeedbackDishService implements OnModuleInit {
	private readonly logger = new Logger(FeedbackDishService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly feedbackService: FeedbackService,
		private readonly feedbackDishAgent: FeedbackDishAgent,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'feedback-dish-links',
			label: 'Dishes for food and drinks points',
			priority: 20,
			remaining: () => this.countPending(),
			runBatch: async () => {
				const res = await this.linkDishes({ limit: BACKLOG_BATCH_POINTS });
				return { done: res.looked, tokens: res.tokens };
			},
		});
	}

	async countPending(): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(`select count(*)::int as n from feedback_points f where ${DISH_PENDING_SQL}`);
		return row.n;
	}

	/**
	 * Looks at up to `limit` pending points (newest month first): each is linked to one of its
	 * source's dishes or marked as looked at with none. Flushes, also when the pool stops on a
	 * provider failure, then rethrows.
	 */
	async linkDishes(opts: {
		limit: number;
	}): Promise<{ looked: number; linked: number; tokens: number }> {
		const ids: { id: number }[] = await this.em
			.getConnection()
			.execute(
				`select f.id from feedback_points f where ${DISH_PENDING_SQL} order by f.month desc, f.id limit ?`,
				[opts.limit],
			);
		if (!ids.length) return { looked: 0, linked: 0, tokens: 0 };
		const rows = await this.em.find(
			FeedbackPoint,
			{ id: { $in: ids.map(r => r.id) } },
			{ orderBy: { id: 'asc' } },
		);
		const keyOf = (row: FeedbackPoint) =>
			sourceOf({ reviewId: row.review?.id, mentionId: row.mention?.id });

		// The dishes each source names: its dish-only rows' and its linked points'
		const reviewIds = _.uniq(rows.map(r => r.review?.id).filter((id): id is string => !!id));
		const mentionIds = _.uniq(rows.map(r => r.mention?.id).filter((id): id is number => !!id));
		const named: { review_id: string | null; mention_id: number | null; dish: string }[] =
			await this.em.getConnection().execute(
				`select review_id, mention_id, dish from feedback_points
			where dish is not null and (review_id in (${reviewIds.map(() => '?').join(', ') || 'null'})
				or mention_id in (${mentionIds.map(() => '?').join(', ') || 'null'}))
			order by id`,
				[...reviewIds, ...mentionIds],
			);
		const dishes = new Map<string, { name: string; key: string }[]>();
		for (const n of named) {
			const source = sourceOf({ reviewId: n.review_id, mentionId: n.mention_id });
			const list = dishes.get(source) ?? [];
			const key = dishKey(n.dish);
			if (key && !list.some(d => d.key === key)) list.push({ name: n.dish, key });
			dishes.set(source, list);
		}

		const now = new Date();
		let looked = 0;
		let linked = 0;
		let tokens = 0;
		const dropDishOnly: { row: FeedbackPoint; key: string }[] = [];
		const ask = rows.filter(row => {
			if (dishes.get(keyOf(row))?.length) return true;
			// A source naming no dish: nothing to pick
			row.dishCheckedAt = now;
			looked++;
			return false;
		});
		const topics = ask.length ? await this.feedbackService.dishTopics() : undefined;
		const byId = new Map(ask.map(r => [String(r.id), r]));
		try {
			await runPool(
				_.chunk(ask, POINTS_PER_CALL),
				CONCURRENCY,
				async batch => {
					const input: FeedbackDishInputPoint[] = batch.map(r => ({
						id: String(r.id),
						kind: r.sentiment === 'positive' ? 'praise' : 'complaint',
						detail: r.detail!,
						dishes: dishes.get(keyOf(r))!.map(d => d.name),
					}));
					const res = await this.feedbackDishAgent.generate(
						JSON.stringify({ points: input }),
					);
					tokens += res.usage?.totalTokens ?? 0;
					for (const answer of res.object.points) {
						const row = byId.get(answer.id);
						if (!row || row.dishCheckedAt) continue;
						row.dishCheckedAt = now;
						looked++;
						const key = answer.dish ? dishKey(answer.dish) : '';
						const dish =
							key ? dishes.get(keyOf(row))!.find(d => d.key === key) : undefined;
						if (!dish) continue;
						row.dish = dish.name;
						row.dishKey = dish.key;
						row.foodTopic = this.feedbackService.topicRef(dish.name, topics!);
						dropDishOnly.push({ row, key: dish.key });
						linked++;
					}
				},
				(batch, e) =>
					this.logger.warn(`Dish batch of ${batch.length} points failed: ${e.message}`),
			);
		} finally {
			await this.em.flush();
			for (const { row, key } of dropDishOnly)
				await this.em.nativeDelete(FeedbackPoint, {
					detail: null,
					dishKey: key,
					...(row.review ? { review: row.review.id } : { mention: row.mention!.id }),
				});
		}
		return { looked, linked, tokens };
	}

	/**
	 * Sends the links this pass made whose phrase doesn't name their dish back to the backlog, to be
	 * looked at again (after the instruction changed): the point loses its dish and its check, and
	 * the source's dish-only row of that dish, which the link dropped, comes back with the point's
	 * polarity unless another row of the source names the dish. A link the pass made is one checked
	 * after the point was stored; links the phrase makes by naming the dish, and the ones extraction
	 * made with the whole review in view, are kept. Flushes.
	 */
	async recheckUnnamed(): Promise<{ points: number; dishOnlyRows: number }> {
		const linked = await this.em.find(
			FeedbackPoint,
			{ detail: { $ne: null }, dish: { $ne: null } },
			{ orderBy: { id: 'asc' } },
		);
		const byPass = (row: FeedbackPoint) =>
			!!row.dishCheckedAt &&
			row.dishCheckedAt.getTime() - row.createdAt.getTime() > PASS_AFTER_MS;
		const unnamed = linked.filter(
			row => byPass(row) && !namesDish(row.detail!, row.dishKey || dishKey(row.dish!)),
		);
		if (!unnamed.length) return { points: 0, dishOnlyRows: 0 };
		const keyOf = (row: FeedbackPoint) =>
			sourceOf({ reviewId: row.review?.id, mentionId: row.mention?.id });
		const back = new Set(unnamed.map(r => r.id));
		// The dish keys each source still names once the links go: its kept links and dish-only rows
		const reviewIds = _.uniq(unnamed.map(r => r.review?.id).filter((id): id is string => !!id));
		const mentionIds = _.uniq(
			unnamed.map(r => r.mention?.id).filter((id): id is number => !!id),
		);
		const others = await this.em.find(FeedbackPoint, {
			dish: { $ne: null },
			$or: [{ review: { $in: reviewIds } }, { mention: { $in: mentionIds } }],
		});
		const named = new Set(
			others
				.filter(r => !back.has(r.id))
				.map(r => `${keyOf(r)} ${r.dishKey || dishKey(r.dish!)}`),
		);
		let dishOnlyRows = 0;
		for (const row of unnamed) {
			const key = row.dishKey || dishKey(row.dish!);
			const id = `${keyOf(row)} ${key}`;
			if (!named.has(id)) {
				named.add(id);
				this.em.create(FeedbackPoint, {
					sourceKind: row.sourceKind,
					review: row.review ?? null,
					mention: row.mention ?? null,
					city: row.city,
					month: row.month,
					sentiment: row.sentiment,
					dish: row.dish,
					dishKey: key,
					foodTopic: row.foodTopic ?? null,
				});
				dishOnlyRows++;
			}
			row.dish = null;
			row.dishKey = null;
			row.foodTopic = null;
			row.dishCheckedAt = null;
		}
		await this.em.flush();
		this.logger.log(
			`Dish links sent back to the backlog: ${unnamed.length} points, ${dishOnlyRows} dish-only rows restored`,
		);
		return { points: unnamed.length, dishOnlyRows };
	}
}
