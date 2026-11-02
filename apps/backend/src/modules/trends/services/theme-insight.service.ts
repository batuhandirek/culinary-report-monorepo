import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import {
	brandFoods,
	countThemes,
	THEME_POST_CLAIMS_SQL,
	THEME_REVIEW_CLAIMS_SQL,
	ThemeClaimRow,
	ThemeCounts,
	ThemeFood,
	ThemeFoodCoverage,
	themeFoods,
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
 * What a city's guests praise and criticise, per theme (an aspect), across every venue: the
 * month's written reviews and posts by others with a claim filed under each theme (its aspect
 * part), their shares and the change against the month before, broken down by kind of food (a
 * brand's is the main food of most of its places in the city) and, with `food`, narrowed to the
 * brands of that food. Reads stored statements only; the one reader behind `/admin/theme-insights`.
 * One aspect's own figures, sentences and breakdowns are the Explore page's (`StatementInsightService`).
 */
@Injectable()
export class ThemeInsightService {
	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	async city(cityId: string, month: string, food?: string): Promise<ThemeInsights> {
		const previous = previousMonth(monthRange(month).start);
		const params = [cityId, monthRange(previous).start, monthRange(month).end];
		const connection = this.em.getConnection();
		const reviews = await connection.execute<ThemeClaimRow[]>(THEME_REVIEW_CLAIMS_SQL, params);
		const posts = await connection.execute<ThemeClaimRow[]>(THEME_POST_CLAIMS_SQL, params);
		const rows = [...reviews, ...posts];
		const index = await this.topicService.index();
		const foods = await this.brandFoods(cityId, rows.map(r => r.brand_id), index);
		const narrowed = food ? rows.filter(r => foods.get(r.brand_id)?.key === food) : rows;
		const covered = themeFoods(rows, month, foods);
		const picked = covered.find(f => f.key === food);
		return {
			month,
			previous,
			food: food ? { key: food, label: picked?.label ?? food } : null,
			foods: covered,
			...countThemes(narrowed, month, previous, index, foods),
		};
	}

	/** The food of each brand, from its places in the city. */
	private async brandFoods(cityId: string, ids: string[], index: TopicIndex): Promise<Map<string, ThemeFood>> {
		const brandIds = [...new Set(ids)];
		if (!brandIds.length) return new Map();
		const venues = await this.em.find(Venue, { brand: { $in: brandIds }, city: cityId });
		const tags = await this.venueTopicService.tags(venues);
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
