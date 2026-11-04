import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { City } from 'src/modules/cities/entities/city.entity.js';

import {
	RATING_SNAPSHOT_BUDGET_HEADROOM,
	RATING_SNAPSHOT_TALKED_DAYS,
	RATING_SNAPSHOT_USD,
} from '../constants/rating-snapshot.constant.js';

import { ReviewService } from './review.service.js';

export interface RatingSnapshotTarget {
	id: string;
	/** Posts that named it (or its brand, no branch) in the window */
	posts: number;
	reviewsCount: number | null;
}

/**
 * The weekly fetch of every open venue (`SNAPSHOT_RATINGS`): its Google reviews since the last
 * fetch and today's rating snapshot (`ReviewService.snapshotRatings`), so reviews, a rating and a
 * review-count trend exist for any venue before its brand is in a report.
 */
@Injectable()
export class RatingSnapshotService {
	constructor(
		private readonly em: EntityManager,
		private readonly reviewService: ReviewService,
	) {}

	/**
	 * The city's open venues, the order a budget too small for all of them cuts in: those posts
	 * named in the last `talkedDays` (`RATING_SNAPSHOT_TALKED_DAYS` by default) most first
	 * (directly, or a branch of a brand a post named without one), then the most reviewed.
	 */
	async due(city: City, now = new Date(), talkedDays = RATING_SNAPSHOT_TALKED_DAYS): Promise<RatingSnapshotTarget[]> {
		const since = new Date(now.getTime() - talkedDays * 86_400_000);
		const rows = await this.em.getConnection().execute<
			{ id: string; posts: number; reviews_count: number | null }[]
		>(
			`with talked as (
				select m.venue_id, m.post_id from mentions m
				join social_posts p on p.id = m.post_id
				where m.venue_id is not null and p.posted_at >= ?
				union
				select v.id, m.post_id from mentions m
				join social_posts p on p.id = m.post_id
				join venues v on v.brand_id = m.brand_id and v.city_id = ?
				where m.venue_id is null and m.brand_id is not null and p.posted_at >= ?
			), counts as (
				select venue_id, count(distinct post_id)::int posts from talked group by venue_id
			)
			select v.id, coalesce(c.posts, 0) posts, v.reviews_count from venues v
			left join counts c on c.venue_id = v.id
			where v.city_id = ? and not v.closed
			order by coalesce(c.posts, 0) desc, v.reviews_count desc nulls last, v.id`,
			[since, city.id, since, city.id],
		);
		return rows.map(r => ({ id: r.id, posts: r.posts, reviewsCount: r.reviews_count }));
	}

	/** Snapshots the city's due venues, as many as the budget plans for. */
	async snapshot(
		city: City,
		budgetUsd: number,
		now = new Date(),
	): Promise<{
		due: number;
		talked: number;
		requested: number;
		saved: number;
		snapshots: number;
		upToDate: number;
		missed: number;
	}> {
		const due = await this.due(city, now);
		const room = Math.floor((budgetUsd * RATING_SNAPSHOT_BUDGET_HEADROOM) / RATING_SNAPSHOT_USD);
		const result = await this.reviewService.snapshotRatings(
			due.slice(0, room).map(v => v.id),
			budgetUsd,
			now,
		);
		return { due: due.length, talked: due.filter(v => v.posts > 0).length, ...result };
	}
}
