import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { runPool } from 'src/shared/util/pool.js';

import { FeedbackThemeAgent, FeedbackThemeInputPoint } from '../agents/feedback-theme.agent.js';
import { FEEDBACK_THEMES } from '../constants/feedback-themes.constant.js';
import { Review } from '../entities/review.entity.js';
import type { FeedbackPoint, FeedbackTheme } from '../interfaces/feedback.interface.js';

/** Anything holding praise and complaint points: a review, a mention. */
export interface FeedbackHolder {
	praise?: FeedbackPoint[] | null;
	complaints?: FeedbackPoint[] | null;
}

// Phrases per call: ~10 tokens each, so a call stays small next to the legend
const POINTS_PER_CALL = 120;
const CONCURRENCY = 5;
const DEFAULT_LIMIT = 500;

/** A jsonb column of points as an array, whatever is stored (SQL null, a stray scalar). */
const pointsOf = (column: string) =>
	`case when jsonb_typeof(${column}) = 'array' then ${column} else '[]'::jsonb end`;

/** SQL: the row (`alias`) holds a praise or complaint point without a theme. */
export const unthemedSql = (alias: string) =>
	`exists (select 1 from jsonb_array_elements(${pointsOf(`${alias}.praise`)} || ${pointsOf(`${alias}.complaints`)}) e
		where jsonb_typeof(e) = 'object' and e->>'theme' is null)`;

/**
 * Themes for points stored before themes existed. The one writer of a stored point's theme:
 * reviews here, mentions through `MentionExtractionService.backfillThemes`, both on `fileThemes`.
 */
@Injectable()
export class FeedbackThemeService {
	private readonly logger = new Logger(FeedbackThemeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly feedbackThemeAgent: FeedbackThemeAgent,
	) {}

	/**
	 * Gives every point of `holders` without a theme one, read from its phrase alone, and its
	 * topic the theme's (the two never disagree). Assigns new arrays to the holders; the caller
	 * flushes, also when this rethrows a provider failure (what finished before it is applied).
	 * A point the agent did not answer keeps no theme and is sent again next run.
	 */
	async fileThemes(holders: FeedbackHolder[]): Promise<{ holders: number; points: number }> {
		const pending = holders.flatMap(holder =>
			(['praise', 'complaints'] as const).flatMap(list =>
				(holder[list] ?? []).flatMap((point, index) =>
					point.theme ? [] : [{ holder, list, index, point }],
				),
			),
		);
		const themes = new Map<number, FeedbackTheme>();
		// A new array per list, so the change is plain to the unit of work
		const apply = () => {
			for (const [i, theme] of themes) {
				const { holder, list, index, point } = pending[i];
				const points = [...(holder[list] ?? [])];
				points[index] = { topic: FEEDBACK_THEMES[theme].topic, theme, detail: point.detail };
				holder[list] = points;
			}
		};

		const batches = _.chunk(
			pending.map((p, i) => ({ ...p, id: i })),
			POINTS_PER_CALL,
		);
		try {
			await runPool(
				batches,
				CONCURRENCY,
				async batch => {
					const input: FeedbackThemeInputPoint[] = batch.map(b => ({
						id: String(b.id),
						kind: b.list === 'praise' ? 'praise' : 'complaint',
						topic: b.point.topic,
						detail: b.point.detail,
					}));
					const res = await this.feedbackThemeAgent.generate(JSON.stringify({ points: input }));
					const asked = new Set(batch.map(b => b.id));
					for (const answer of res.object.points) {
						const id = Number(answer.id);
						if (asked.has(id)) themes.set(id, answer.theme);
					}
				},
				(batch, e) => this.logger.warn(`Theme batch of ${batch.length} points failed: ${e.message}`),
			);
		} finally {
			// Kept also when the pool stops on a provider failure: the caller flushes, then rethrows
			apply();
		}
		return { holders: new Set([...themes.keys()].map(i => pending[i].holder)).size, points: themes.size };
	}

	/**
	 * Reviews (of one city's venues, or all), newest first, whose points lack a theme. Picked by
	 * their points alone, not `analysedAt`: a row can carry points without it (a raw reset, a copy),
	 * and a report leaves its theme counts out while any point lacks a theme.
	 */
	private async unthemedReviewIds(cityId: string | undefined, limit?: number): Promise<string[]> {
		const rows: { id: string }[] = await this.em.getConnection().execute(
			`select r.id from reviews r
				${cityId ? 'join venues v on v.id = r.venue_id' : ''}
			where ${unthemedSql('r')}
				${cityId ? 'and v.city_id = ?' : ''}
			order by r.published_at desc, r.id
			${limit ? 'limit ?' : ''}`,
			[...(cityId ? [cityId] : []), ...(limit ? [limit] : [])],
		);
		return rows.map(r => r.id);
	}

	async countUnthemedReviews(cityId?: string): Promise<number> {
		const [row]: { n: number }[] = await this.em.getConnection().execute(
			`select count(*)::int as n from reviews r
				${cityId ? 'join venues v on v.id = r.venue_id' : ''}
			where ${unthemedSql('r')}
				${cityId ? 'and v.city_id = ?' : ''}`,
			cityId ? [cityId] : [],
		);
		return row.n;
	}

	/**
	 * Files the points of up to `limit` reviews that hold a point without a theme
	 * (newest first). Free (the LLM allowance).
	 */
	async backfillReviews(opts: {
		cityId?: string;
		limit?: number;
	}): Promise<{ reviews: number; points: number }> {
		const ids = await this.unthemedReviewIds(opts.cityId, opts.limit ?? DEFAULT_LIMIT);
		if (!ids.length) return { reviews: 0, points: 0 };
		const reviews = await this.em.find(Review, { id: { $in: ids } });
		let filed: { holders: number; points: number };
		try {
			filed = await this.fileThemes(reviews);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		await this.em.flush();
		return { reviews: filed.holders, points: filed.points };
	}
}
