import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';
import { runPool } from 'src/shared/util/pool.js';

import { FeedbackThemeAgent, FeedbackThemeInputPoint } from '../agents/feedback-theme.agent.js';
import { FeedbackPoint } from '../entities/feedback-point.entity.js';

// Phrases per call: ~10 tokens each, so a call stays small next to the legend
const POINTS_PER_CALL = 120;
const CONCURRENCY = 5;
// Points a daily-backlog batch files (~5 agent calls)
const BACKLOG_BATCH_POINTS = 600;

/** SQL: a point (`f`) not filed under a theme yet */
export const UNFILED_SQL = 'f.detail is not null and f.theme is null';

/**
 * Aspects for points that have none: stored before the aspects existed, or answered with a key the
 * table doesn't have. Read from the phrase alone (`FeedbackThemeAgent`, the legend from the table),
 * never by extracting a source again. A daily LLM backlog (`feedback-themes`).
 */
@Injectable()
export class FeedbackThemeService implements OnModuleInit {
	private readonly logger = new Logger(FeedbackThemeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly feedbackThemeAgent: FeedbackThemeAgent,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
		private readonly topicService: TopicService,
	) {}

	/** Unfiled points are a daily LLM backlog; reports leave theme counts out until they are filed */
	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'feedback-themes',
			label: 'Themes for points',
			priority: 10,
			remaining: () => this.countUnfiled(),
			runBatch: async () => {
				const res = await this.fileThemes({ limit: BACKLOG_BATCH_POINTS });
				return { done: res.points, tokens: res.tokens };
			},
		});
	}

	async countUnfiled(cityId?: string): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(
				`select count(*)::int as n from feedback_points f where ${UNFILED_SQL} ${cityId ? 'and f.city_id = ?' : ''}`,
				cityId ? [cityId] : [],
			);
		return row.n;
	}

	/**
	 * Files up to `limit` unfiled points (of one city, or all; newest month first) under a theme
	 * each, and sets the topic to the theme's (the two never disagree). Flushes, also when the pool
	 * stops on a provider failure, then rethrows. A point the agent didn't answer is sent again.
	 */
	async fileThemes(opts: {
		cityId?: string;
		limit: number;
	}): Promise<{ points: number; tokens: number }> {
		const rows = await this.em.find(
			FeedbackPoint,
			{ detail: { $ne: null }, theme: null, ...(opts.cityId && { city: opts.cityId }) },
			{ orderBy: { month: 'desc', id: 'asc' }, limit: opts.limit },
		);
		const byId = new Map(rows.map(r => [String(r.id), r]));
		const index = await this.topicService.index();
		const legend = index.aspectLegend();
		let filed = 0;
		let tokens = 0;
		try {
			await runPool(
				_.chunk(rows, POINTS_PER_CALL),
				CONCURRENCY,
				async batch => {
					const input: FeedbackThemeInputPoint[] = batch.map(r => ({
						id: String(r.id),
						kind:
							r.change ? 'change'
							: r.sentiment === 'positive' ? 'praise'
							: 'complaint',
						topic: r.topic ?? 'other',
						detail: r.detail!,
					}));
					const res = await this.feedbackThemeAgent.generate(
						JSON.stringify({ points: input }),
						{ legend },
					);
					tokens += res.usage?.totalTokens ?? 0;
					const asked = new Set(input.map(p => p.id));
					for (const answer of res.object.points) {
						const row = asked.has(answer.id) ? byId.get(answer.id) : undefined;
						// An unknown key is no answer: the point is asked again next run
						const aspect = index.aspect(answer.theme);
						if (!row || row.theme || !aspect) continue;
						row.theme = aspect.key;
						row.aspect = aspect.id ? this.em.getReference(Topic, aspect.id) : null;
						row.topic = aspect.root as FeedbackTopic;
						filed++;
					}
				},
				(batch, e) =>
					this.logger.warn(`Theme batch of ${batch.length} points failed: ${e.message}`),
			);
		} finally {
			// Kept also when the pool stops on a provider failure: what finished is applied
			await this.em.flush();
		}
		return { points: filed, tokens };
	}
}
