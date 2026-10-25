import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { runPool } from 'src/shared/util/pool.js';

import { FeedbackAmountAgent, FeedbackAmountInputPoint } from '../agents/feedback-amount.agent.js';
import { FeedbackPoint } from '../entities/feedback-point.entity.js';
import { AMOUNT_UNITS, parseAmount } from '../util/amounts.js';

const POINTS_PER_CALL = 20;
const CONCURRENCY = 5;
// Points a daily-backlog batch looks at (~10 agent calls)
const BACKLOG_BATCH_POINTS = 200;
// A review or post is cut to this before it goes to the agent
const TEXT_CHARS = 2000;

/** SQL: a wait or price point (`f`) whose amount nobody decided yet */
export const AMOUNT_PENDING_SQL = `f.detail is not null and not f.change and f.amount is null and f.amount_checked_at is null and f.topic in (${Object.keys(
	AMOUNT_UNITS,
)
	.map(t => `'${t}'`)
	.join(', ')})`;

/**
 * The number a stored wait or price point's source states, for points stored before points had one:
 * the phrase is parsed first (free), the rest go with their review's or post's text to
 * `FeedbackAmountAgent`. A point is looked at once (`amountCheckedAt`, also when none is stated).
 * A daily LLM backlog (`feedback-amounts`).
 */
@Injectable()
export class FeedbackAmountService implements OnModuleInit {
	private readonly logger = new Logger(FeedbackAmountService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly feedbackAmountAgent: FeedbackAmountAgent,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'feedback-amounts',
			label: 'Amounts for wait and price points',
			priority: 30,
			remaining: () => this.countPending(),
			runBatch: async () => {
				const res = await this.readAmounts({ limit: BACKLOG_BATCH_POINTS });
				return { done: res.looked, tokens: res.tokens };
			},
		});
	}

	async countPending(): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(
				`select count(*)::int as n from feedback_points f where ${AMOUNT_PENDING_SQL}`,
			);
		return row.n;
	}

	/**
	 * Looks at up to `limit` pending points (newest month first). Flushes, also when the pool stops
	 * on a provider failure, then rethrows.
	 */
	async readAmounts(opts: {
		limit: number;
	}): Promise<{ looked: number; found: number; tokens: number }> {
		const texts: { id: number; text: string | null }[] = await this.em.getConnection().execute(
			`select f.id, coalesce(r.text_translated, r.text, concat_ws(E'\\n', p.text, p.subtitles)) as text
			from feedback_points f
			left join reviews r on r.id = f.review_id
			left join mentions m on m.id = f.mention_id
			left join social_posts p on p.id = m.post_id
			where ${AMOUNT_PENDING_SQL}
			order by f.month desc, f.id limit ?`,
			[opts.limit],
		);
		if (!texts.length) return { looked: 0, found: 0, tokens: 0 };
		const textOf = new Map(texts.map(t => [t.id, t.text?.trim() || null]));
		const rows = await this.em.find(
			FeedbackPoint,
			{ id: { $in: texts.map(t => t.id) } },
			{ orderBy: { id: 'asc' } },
		);

		const now = new Date();
		let looked = 0;
		let found = 0;
		let tokens = 0;
		const set = (row: FeedbackPoint, amount: number | undefined) => {
			row.amountCheckedAt = now;
			looked++;
			if (amount === undefined || !Number.isFinite(amount) || amount <= 0) return;
			row.amount = amount;
			row.unit = AMOUNT_UNITS[row.topic!]!;
			found++;
		};
		const ask = rows.filter(row => {
			const parsed = parseAmount(row.detail!, row.topic);
			if (parsed) set(row, parsed.amount);
			// Nothing to read beyond the phrase
			else if (!textOf.get(row.id)) set(row, undefined);
			return !row.amountCheckedAt;
		});
		const byId = new Map(ask.map(r => [String(r.id), r]));
		try {
			await runPool(
				_.chunk(ask, POINTS_PER_CALL),
				CONCURRENCY,
				async batch => {
					const input: FeedbackAmountInputPoint[] = batch.map(r => ({
						id: String(r.id),
						measure: r.topic === 'wait' ? 'minutes waited' : 'price',
						detail: r.detail!,
						text: textOf.get(r.id)!.slice(0, TEXT_CHARS),
					}));
					const res = await this.feedbackAmountAgent.generate(
						JSON.stringify({ points: input }),
					);
					tokens += res.usage?.totalTokens ?? 0;
					for (const answer of res.object.points) {
						const row = byId.get(answer.id);
						if (row && !row.amountCheckedAt) set(row, answer.amount ?? undefined);
					}
				},
				(batch, e) =>
					this.logger.warn(`Amount batch of ${batch.length} points failed: ${e.message}`),
			);
		} finally {
			await this.em.flush();
		}
		return { looked, found, tokens };
	}
}
