import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import {
	brandFoods,
	countThemes,
	THEME_POST_POINTS_SQL,
	THEME_REVIEW_POINTS_SQL,
	ThemeCounts,
	ThemeFood,
	ThemeFoodCoverage,
	themeFoods,
	ThemePointRow,
} from '../util/theme-counts.js';

export interface ThemeInsights extends ThemeCounts {
	month: string;
	/** The month the changes are against */
	previous: string;
	/** The kind of food the counts are narrowed to, null for every brand */
	food: ThemeFood | null;
	/** The month's kinds of food, whatever `food` is: what they can be narrowed to */
	foods: ThemeFoodCoverage[];
}

/**
 * What a city's guests praise and criticise, per feedback theme, across every venue: the month's
 * written reviews and posts by others raising each theme, their shares and the change against the
 * month before, broken down by kind of food (a brand's is the main food of most of its places in
 * the city) and, with `food`, narrowed to the brands of that food. Reads stored rows only; the one
 * reader behind `/admin/theme-insights`.
 */
@Injectable()
export class ThemeInsightService {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	async city(cityId: string, month: string, food?: string): Promise<ThemeInsights> {
		const previous = previousMonth(monthRange(month).start);
		const params = [cityId, monthRange(previous).start, monthRange(month).end];
		const connection = this.em.getConnection();
		const reviews = await connection.execute<ThemePointRow[]>(THEME_REVIEW_POINTS_SQL, params);
		const posts = await connection.execute<ThemePointRow[]>(THEME_POST_POINTS_SQL, params);
		const rows = [...reviews, ...posts];
		const foods = await this.brandFoods(cityId, rows);
		const narrowed = food ? rows.filter(r => foods.get(r.brand_id)?.key === food) : rows;
		const covered = themeFoods(rows, month, foods);
		const picked = covered.find(f => f.key === food);
		return {
			month,
			previous,
			food: food ? { key: food, label: picked?.label ?? food } : null,
			foods: covered,
			...countThemes(narrowed, month, previous, foods),
		};
	}

	/** The food of each brand in the rows, from its places in the city. */
	private async brandFoods(cityId: string, rows: ThemePointRow[]): Promise<Map<string, ThemeFood>> {
		const brandIds = [...new Set(rows.map(r => r.brand_id))];
		if (!brandIds.length) return new Map();
		const index = await this.foodTopicService.index();
		const venues = await this.em.find(Venue, { brand: { $in: brandIds }, city: cityId });
		const tags = await this.venueFoodTopicService.tags(venues, index);
		return brandFoods(
			venues.map(v => {
				const key = tags.get(v.id)?.find(t => t.primary)?.key;
				return {
					brandId: v.brand.id,
					food: key ? { key, label: index.get(key)?.label ?? key } : undefined,
					reviews: v.reviewsCount ?? 0,
				};
			}),
		);
	}
}
