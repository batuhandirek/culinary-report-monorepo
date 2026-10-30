import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { TopicRelinkService } from 'src/modules/topics/services/topic-relink.service.js';
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
	byTheme: { theme: string; venues: number; brands: number; sources: number }[];
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
export class FeedbackService implements OnModuleInit {
	private readonly logger = new Logger(FeedbackService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly dishNameService: DishNameService,
		private readonly topicService: TopicService,
		private readonly topicRelinkService: TopicRelinkService,
	) {}

	/** A point's aspect follows the topics: after an aspect is deleted or moved, the relink job runs `realign` */
	onModuleInit() {
		this.topicRelinkService.register({ key: 'feedback-aspects', relink: () => this.realign() });
	}

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
		return feedbackRows(answer, { asked: opts.asked, aspects: opts.topics.index }).map(row =>
			this.em.create(FeedbackPoint, {
				...base,
				sentiment: row.sentiment,
				topic: row.topic,
				theme: row.theme,
				aspect: row.aspectId ? this.em.getReference(Topic, row.aspectId) : null,
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
	topicRef(dish: string | null | undefined, topics: DishTopics): Topic | null {
		const id = topics.topicId(dish);
		return id ? this.em.getReference(Topic, id) : null;
	}

	/**
	 * After the aspects changed (the relink job, after an admin created, moved or deleted one): every
	 * filed row linked to the aspect row of its `theme` key; a row whose aspect is gone filed at its
	 * root (`theme` = `topic`, the parent of a deleted leaf: counts stay whole, no LLM); every row's
	 * `topic` set to its aspect's root (an aspect moved under another root). Cheap SQL. Registered as
	 * the re-linker `feedback-aspects`.
	 */
	async realign(): Promise<{ linked: number; movedToRoot: number; topicsMoved: number }> {
		const conn = this.em.getConnection();
		const live = `t.kind = 'aspect' and t.deleted_at is null`;
		const linked = await conn.execute(
			`update feedback_points f set aspect_id = t.id
			from topics t where t.key = f.theme and ${live} and f.aspect_id is distinct from t.id`,
			[],
			'run',
		);
		const movedToRoot = await conn.execute(
			`update feedback_points f set theme = f.topic, aspect_id = r.id
			from topics r
			where r.key = f.topic and r.kind = 'aspect' and r.deleted_at is null
				and f.theme is not null
				and not exists (select 1 from topics t where t.key = f.theme and ${live})`,
			[],
			'run',
		);
		const topicsMoved = await conn.execute(
			`update feedback_points f set topic = root.key
			from topics t join topics root on root.id = coalesce(t.parent_id, t.id)
			where t.id = f.aspect_id and f.topic is distinct from root.key`,
			[],
			'run',
		);
		const result = {
			linked: affected(linked),
			movedToRoot: affected(movedToRoot),
			topicsMoved: affected(topicsMoved),
		};
		if (result.linked || result.movedToRoot || result.topicsMoved)
			this.logger.log(`Realigned feedback aspects: ${JSON.stringify(result)}`);
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
		const waitAspects = (await this.topicService.index()).descendants('wait');
		const rows: {
			theme: string;
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
			byTheme: waitAspects
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
