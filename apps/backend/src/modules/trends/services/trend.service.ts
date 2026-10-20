import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import type { FeedbackDish } from 'src/modules/venues/interfaces/feedback.interface.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import type { CityTrends } from '../interfaces/city-trends.interface.js';
import {
	computeTrends,
	TrendMention,
	TrendMonthInput,
	TrendReview,
} from '../util/compute-trends.js';

/**
 * What is getting popular in the city: cuisines, dishes, districts, creators and rising brands,
 * as shares of a month against the month before. Matched mentions only, never a brand's own
 * posts. Read-only SQL; reports reuse it through `month`.
 */
@Injectable()
export class TrendService {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
	) {}

	/** The city's trend tables for a month (`YYYY-MM`) against the month before. */
	async month(month: string, cityId: string): Promise<CityTrends> {
		return (await this.monthWithMentions(month, cityId)).trends;
	}

	/**
	 * The month's tables and the mentions they count (posts by others, matched, in the city):
	 * the report places its brand among them.
	 */
	async monthWithMentions(
		month: string,
		cityId: string,
	): Promise<{ trends: CityTrends; mentions: TrendMention[] }> {
		const prev = previousMonth(monthRange(month).start);
		// One after another: they share the connection
		const current = await this.input(month, cityId);
		const previous = await this.input(prev, cityId);
		return {
			trends: computeTrends(
				month,
				prev,
				current,
				previous,
				await this.foodTopicService.index(),
			),
			mentions: current.mentions,
		};
	}

	private async input(month: string, cityId: string): Promise<TrendMonthInput> {
		const { start, end } = monthRange(month);
		// A mention naming a chain but no branch has no district, and the category of the
		// chain's most reviewed branch in the city
		const mentionRows: {
			brand_id: string;
			brand_name: string;
			venue_name: string | null;
			district: string | null;
			category: string | null;
			cuisine: string | null;
			dishes: FeedbackDish[] | null;
			post_id: string;
			creator: string | null;
			views: string | number;
		}[] = await this.em.getConnection().execute(
			`select m.brand_id, b.name as brand_name, v.name as venue_name, v.district,
				coalesce(v.category, (
					select o.category from venues o where o.brand_id = m.brand_id and o.city_id = p.city_id
					order by o.reviews_count desc nulls last, o.id limit 1
				)) as category,
				m.cuisine, m.dishes, p.id as post_id, c.name as creator, p.views
			from mentions m
			join social_posts p on p.id = m.post_id
			join brands b on b.id = m.brand_id
			left join venues v on v.id = m.venue_id
			left join social_accounts a on a.id = p.account_id
			left join creators c on c.id = a.creator_id
			where p.city_id = ? and p.posted_at >= ? and p.posted_at < ?
				and not ${ownPostSql('p', 'm.brand_id')}`,
			[cityId, start, end],
		);
		const reviewRows: {
			brand_id: string;
			brand_name: string;
			dishes: FeedbackDish[] | null;
		}[] = await this.em.getConnection().execute(
			`select v.brand_id, b.name as brand_name, r.dishes
				from reviews r join venues v on v.id = r.venue_id join brands b on b.id = v.brand_id
				where v.city_id = ? and r.published_at >= ? and r.published_at < ?
					and jsonb_array_length(coalesce(r.dishes, '[]'::jsonb)) > 0`,
			[cityId, start, end],
		);

		// A brand's own account is not word of mouth: the query leaves its posts out
		const mentions: TrendMention[] = mentionRows.map(r => ({
				brandId: r.brand_id,
				brandName: r.brand_name,
				district: r.district,
				category: r.category,
				cuisine: r.cuisine,
				dishes: r.dishes ?? [],
				postId: r.post_id,
				creator: r.creator,
				views: Number(r.views),
			}));
		const reviews: TrendReview[] = reviewRows.map(r => ({
			brandId: r.brand_id,
			brandName: r.brand_name,
			dishes: r.dishes ?? [],
		}));
		return { mentions, reviews };
	}
}
