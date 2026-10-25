import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import {
	FEEDBACK_THEME_KEYS,
	FEEDBACK_THEMES,
	type FeedbackTheme,
	themesOfTopic,
} from 'src/modules/venues/constants/feedback-themes.constant.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import { FeedbackPoint } from '../entities/feedback-point.entity.js';
import type { DishTopics } from '../util/dish-topics.js';
import { type FeedbackAnswer, feedbackRows } from '../util/feedback-rows.js';

import { DishNameService } from './dish-name.service.js';

/** "How many venues had a waiting complaint, and how long": a city's month */
export interface WaitComplaints {
	month: string;
	/** Places with a wait complaint in a review or a post by others (a brand-only post counts its brand) */
	venues: number;
	brands: number;
	/** Reviews and posts raising one */
	sources: number;
	reviews: number;
	posts: number;
	byTheme: { theme: FeedbackTheme; venues: number; brands: number; sources: number }[];
	/** The minutes complaints state */
	stated: {
		complaints: number;
		of: number;
		median?: number;
		upperQuartile?: number;
		max?: number;
	};
}

/** Rows an update touched, from `execute(…, 'run')` */
const affected = (result: unknown) => (result as { affectedRows?: number }).affectedRows ?? 0;

/** YYYY-MM in UTC */
const monthOf = (date: Date) => date.toISOString().slice(0, 7);

/**
 * What posts and reviews say, as rows (`FeedbackPoint`): the one writer. Reviews and mentions are
 * the raw sources; every reader joins brand and venue through them, never copied here.
 */
@Injectable()
export class FeedbackService {
	private readonly logger = new Logger(FeedbackService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly dishNameService: DishNameService,
	) {}

	/** What the writers link dishes with (`DishNameService.dishTopics`), read fresh */
	dishTopics(): Promise<DishTopics> {
		return this.dishNameService.dishTopics();
	}

	/**
	 * Replaces a source's rows with what `answer` says (`feedbackRows`), in the caller's unit of
	 * work, so they flush in the transaction that writes the source. The source's `feedback` must be
	 * loaded (populate it, or a new source); a review needs its venue, a mention its post.
	 */
	replaceFor(
		source: Review | Mention,
		answer: FeedbackAnswer,
		opts: { asked: boolean; topics: DishTopics; now?: Date },
	): FeedbackPoint[] {
		if (!source.feedback.isInitialized())
			throw new Error('FeedbackService.replaceFor needs the source with its feedback loaded');
		const now = opts.now ?? new Date();
		const base =
			source instanceof Review ?
				{
					sourceKind: 'review' as const,
					review: source,
					city: source.venue.city,
					month: monthOf(source.publishedAt),
				}
			:	{
					sourceKind: 'mention' as const,
					mention: source,
					city: source.post.city,
					month: monthOf(source.post.postedAt),
				};
		if (!base.city)
			throw new Error(
				"FeedbackService.replaceFor needs the review's venue or the mention's post loaded",
			);
		source.feedback.removeAll();
		return feedbackRows(answer, opts).map(row =>
			this.em.create(FeedbackPoint, {
				...base,
				sentiment: row.sentiment,
				topic: row.topic,
				theme: row.theme,
				detail: row.detail,
				dish: row.dish,
				dishKey: row.dishKey,
				foodTopic: this.topicRef(row.dish, opts.topics),
				amount: row.amount,
				unit: row.unit,
				dishCheckedAt: row.dishChecked ? now : null,
				amountCheckedAt: row.amountChecked ? now : null,
				change: row.change,
			}),
		);
	}

	/** The stored link for a dish: its name's topic (`DishTopics.topicId`) */
	topicRef(dish: string | null | undefined, topics: DishTopics): FoodTopic | null {
		const id = topics.topicId(dish);
		return id ? this.em.getReference(FoodTopic, id) : null;
	}

	/**
	 * After the vocabulary changed: every filed row's `topic` set from `FEEDBACK_THEMES` (a theme
	 * moved to another topic), and rows whose theme no longer exists sent back to filing (theme
	 * null, kept on their stored topic), which the `feedback-themes` backlog picks up. Cheap SQL.
	 */
	async realign(): Promise<{ topicsMoved: number; unfiled: number }> {
		const conn = this.em.getConnection();
		const pairs = FEEDBACK_THEME_KEYS.map(key => [key, FEEDBACK_THEMES[key].topic]);
		const moved = await conn.execute(
			`update feedback_points f set topic = x.topic
			from (values ${pairs.map(() => '(?, ?)').join(', ')}) as x(theme, topic)
			where f.theme = x.theme and f.topic is distinct from x.topic`,
			pairs.flat(),
			'run',
		);
		const unfiled = await conn.execute(
			`update feedback_points set theme = null
			where theme is not null and theme not in (${FEEDBACK_THEME_KEYS.map(() => '?').join(', ')})`,
			[...FEEDBACK_THEME_KEYS],
			'run',
		);
		const result = { topicsMoved: affected(moved), unfiled: affected(unfiled) };
		if (result.topicsMoved || result.unfiled)
			this.logger.log(`Realigned feedback themes: ${JSON.stringify(result)}`);
		return result;
	}

	/**
	 * A city's month of waiting complaints: the places, brands and sources with a complaint under any
	 * `wait` theme (a place once, however many), per theme, and the minutes the complaints state.
	 * Reviews of the city's venues with text, and matched mentions in posts by others (own posts
	 * out); a mention without a branch counts its brand.
	 */
	async waitComplaints(cityId: string, month: string): Promise<WaitComplaints> {
		const { start, end } = monthRange(month);
		const rows: {
			theme: FeedbackTheme;
			source: string;
			venue: string | null;
			brand: string;
			kind: 'review' | 'mention';
			amount: number | null;
			unit: string | null;
		}[] = await this.em.getConnection().execute(
			`select f.theme, 'r' || r.id as source, r.venue_id as venue, v.brand_id as brand, 'review' as kind, f.amount, f.unit
			from feedback_points f
			join reviews r on r.id = f.review_id
			join venues v on v.id = r.venue_id
			where f.city_id = ? and f.month = ? and f.sentiment = 'negative' and f.topic = 'wait'
				and coalesce(r.text_translated, r.text, '') <> ''
			union all
			select f.theme, 'p' || p.id as source, m.venue_id as venue, m.brand_id as brand, 'mention' as kind, f.amount, f.unit
			from feedback_points f
			join mentions m on m.id = f.mention_id
			join social_posts p on p.id = m.post_id
			where f.city_id = ? and f.month = ? and f.sentiment = 'negative' and f.topic = 'wait'
				and m.brand_id is not null and p.posted_at >= ? and p.posted_at < ?
				and not ${ownPostSql('p', 'm.brand_id')}`,
			[cityId, month, cityId, month, start, end],
		);
		const place = (r: (typeof rows)[number]) => r.venue ?? `brand:${r.brand}`;
		const count = (list: typeof rows) => ({
			venues: new Set(list.map(place)).size,
			brands: new Set(list.map(r => r.brand)).size,
			sources: new Set(list.map(r => r.source)).size,
		});
		// A complaint is a source's point; a source stating two waits keeps its longest
		const stated = Object.values(
			_.groupBy(
				rows.filter(r => r.unit === 'minutes' && r.amount != null),
				r => r.source,
			),
		).map(group => _.max(group.map(r => r.amount!))!);
		const quantile = (q: number) => {
			if (!stated.length) return undefined;
			const sorted = [...stated].sort((a, b) => a - b);
			const pos = (sorted.length - 1) * q;
			const lo = Math.floor(pos);
			return sorted[lo] + (sorted[Math.ceil(pos)] - sorted[lo]) * (pos - lo);
		};
		return {
			month,
			...count(rows),
			reviews: new Set(rows.filter(r => r.kind === 'review').map(r => r.source)).size,
			posts: new Set(rows.filter(r => r.kind === 'mention').map(r => r.source)).size,
			byTheme: themesOfTopic('wait')
				.map(theme => ({ theme, ...count(rows.filter(r => r.theme === theme)) }))
				.filter(t => t.sources),
			stated: {
				complaints: stated.length,
				of: new Set(rows.map(r => r.source)).size,
				median: quantile(0.5),
				upperQuartile: quantile(0.75),
				max: stated.length ? Math.max(...stated) : undefined,
			},
		};
	}
}
