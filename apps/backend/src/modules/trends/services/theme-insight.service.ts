import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import {
	FEEDBACK_THEMES,
	type FeedbackTheme,
	isFeedbackTheme,
} from 'src/modules/venues/constants/feedback-themes.constant.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import type { FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';
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
import {
	monthsUpTo,
	THEME_BASE_SOURCES_SQL,
	THEME_BASE_SQL,
	THEME_MONTHS,
	THEME_POST_DETAIL_SQL,
	THEME_REVIEW_DETAIL_SQL,
	type ThemeBaseMonth,
	type ThemeBaseSource,
	type ThemeDetail,
	themeDetail,
	type ThemeDetailFilters,
	type ThemeDetailRow,
} from '../util/theme-detail.js';

export interface ThemeInsights extends ThemeCounts {
	month: string;
	/** The month the changes are against */
	previous: string;
	/** The kind of food the counts are narrowed to, null for every brand */
	food: ThemeFood | null;
	/** The month's kinds of food, whatever `food` is: what they can be narrowed to */
	foods: ThemeFoodCoverage[];
}

export interface ThemeInsight extends ThemeDetail {
	key: FeedbackTheme;
	topic: FeedbackTopic;
	label: string;
	/** What the theme covers, as the agents are told */
	hint: string;
	month: string;
	previous: string;
	side: ThemeDetailFilters['side'];
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
		const foods = await this.brandFoods(
			cityId,
			rows.map(r => r.brand_id),
		);
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

	/**
	 * One theme in a city's month: its complaints, praise and noticed changes, the picked side over
	 * six months, where it came up, the numbers its points state and the month's sentences filed
	 * under it, narrowed by `filters`. Reads stored rows only. 404 for a key the vocabulary lacks.
	 */
	async theme(
		cityId: string,
		month: string,
		theme: string,
		filters: ThemeDetailFilters,
	): Promise<ThemeInsight> {
		if (!isFeedbackTheme(theme)) throw new NotFoundException(`No feedback theme ${theme}`);
		const start = monthRange(monthsUpTo(month, THEME_MONTHS)[0]).start;
		const { start: monthStart, end } = monthRange(month);
		const connection = this.em.getConnection();
		const window = [cityId, start, end];
		const reviews = await connection.execute<ThemeDetailRow[]>(THEME_REVIEW_DETAIL_SQL, [
			theme,
			...window,
		]);
		const posts = await connection.execute<ThemeDetailRow[]>(THEME_POST_DETAIL_SQL, [
			theme,
			...window,
		]);
		const bases = await connection.execute<ThemeBaseMonth[]>(THEME_BASE_SQL, [
			...window,
			...window,
		]);
		const ofMonth = [cityId, monthStart, end];
		const baseSources = await connection.execute<ThemeBaseSource[]>(THEME_BASE_SOURCES_SQL, [
			...ofMonth,
			...ofMonth,
		]);
		const foods = await this.brandFoods(
			cityId,
			baseSources.map(s => s.brand_id),
		);
		const definition = FEEDBACK_THEMES[theme];
		return {
			key: theme,
			topic: definition.topic,
			label: definition.label,
			hint: definition.hint,
			month,
			previous: previousMonth(monthStart),
			side: filters.side,
			...themeDetail({
				rows: [...reviews, ...posts],
				bases,
				baseSources,
				month,
				foods,
				filters,
			}),
		};
	}

	/** The food of each brand, from its places in the city. */
	private async brandFoods(cityId: string, ids: string[]): Promise<Map<string, ThemeFood>> {
		const brandIds = [...new Set(ids)];
		if (!brandIds.length) return new Map();
		const index = await this.foodTopicService.index();
		const venues = await this.em.find(Venue, { brand: { $in: brandIds }, city: cityId });
		const tags = await this.venueFoodTopicService.tags(venues);
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
