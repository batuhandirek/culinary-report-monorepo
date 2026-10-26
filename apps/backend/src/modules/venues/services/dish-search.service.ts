import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { districtNames } from 'src/modules/cities/util/city.js';
import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';

import { DishSearchRank } from '../entities/dish-search-rank.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	DISH_SEARCH_DEPTH,
	dishesWithinBudget,
	type DishSearchDistrict,
	dishSearches,
	dishSearchTable,
} from '../util/dish-searches.js';
import { orderedPlaces, type SearchPlaceItem } from '../util/search-ranks.js';
import { calendarDay } from '../util/week.js';

import { VenueScrapeService } from './venue-scrape.service.js';

/** How many snapshots a dish's picker offers, newest first */
const TOPIC_SNAPSHOTS = 36;

/** A dish's searches in one snapshot, with the snapshots there are to pick from. */
export interface TopicDishSearches {
	/** Every snapshot the dish was searched in, newest first */
	snapshots: string[];
	/** The snapshot shown; absent when the dish was never searched */
	searchedOn?: string;
	/** The snapshot before it, which the moves compare with */
	previousOn?: string;
	districts: DishSearchDistrict[];
}

/** A venue's places on the dish searches, snapshot by snapshot. */
export interface VenueDishSearches {
	/** Its city's latest snapshots, newest first */
	snapshots: string[];
	/** Each search it was in the top ten of in those snapshots, best latest rank first */
	searches: {
		topicKey: string;
		topicLabel: string;
		district: string;
		/** One per snapshot the search ran in; `rank` absent when it was not in the top ten */
		ranks: { searchedOn: string; rank?: number }[];
	}[];
}

/**
 * Who Google Maps puts first for each dish in each district ("pasta Mitte Berlin"): every dish
 * topic × every district of the city, the top ten each, kept as a dated snapshot of that day's
 * rankings (`TRACK_DISH_SEARCHES`, every `City.dishSearchEveryDays`). One Places run for all of
 * them; the places found are saved as venues (`saveFound`), which also writes each venue's rating
 * snapshot of the day.
 */
@Injectable()
export class DishSearchService {
	private readonly logger = new Logger(DishSearchService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/**
	 * Takes today's snapshot (the city's local date): searches every dish in every district of
	 * the city, as many dishes as the budget covers (the ones most of the city's open venues serve
	 * first), and stores each search's top ten, replacing that day's rows of each search that came
	 * back. A search that came back empty (failed, or cut by the cap) stores nothing.
	 */
	async sweep(
		city: City,
		budgetUsd: number,
		now = new Date(),
	): Promise<{
		searchedOn: string;
		dishes: number;
		districts: number;
		searches: number;
		returned: number;
		places: number;
		linked: number;
		notCovered: number;
	}> {
		const day = calendarDay(now, city.timezone);
		const districts = districtNames(city);
		const served = await this.venueFoodTopicService.venueCounts(city.id);
		const dishes = _.orderBy(
			(await this.foodTopicService.all()).filter(t => t.kind === FoodTopicKindEnum.DISH),
			[t => served.get(t.key) ?? 0, t => t.key],
			['desc', 'asc'],
		);
		const planned = dishes.slice(0, dishesWithinBudget(budgetUsd, districts.length));
		const searches = dishSearches(
			planned.map(t => t.key),
			districts,
			city.name,
		);
		const summary = {
			searchedOn: day.date,
			dishes: planned.length,
			districts: districts.length,
			searches: searches.length,
			returned: 0,
			places: 0,
			linked: 0,
			notCovered: dishes.length - planned.length,
		};
		if (!searches.length) return summary;

		const { items } = await this.venueScrapeService.searchPlaces<SearchPlaceItem>(
			city,
			searches.map(s => s.text),
			DISH_SEARCH_DEPTH,
			budgetUsd,
			`google-places dish searches ${city.name} ${day.date}: ${searches.length} searches`,
		);
		const byText = _.groupBy(items, i => i.searchString ?? '');
		const known = await this.em.find(
			Venue,
			{ placeId: { $in: _.uniq(items.map(i => i.placeId).filter(Boolean)) as string[] } },
			{ fields: ['placeId'] },
		);
		const venueIds = new Map(known.map(v => [v.placeId, v.id]));
		const topics = new Map(planned.map(t => [t.key, t]));

		const results = searches
			.map(search => ({
				search,
				top: orderedPlaces(byText[search.text] ?? []).slice(0, DISH_SEARCH_DEPTH),
			}))
			.filter(r => r.top.length);
		if (results.length) {
			await this.em.nativeDelete(DishSearchRank, {
				city: city.id,
				searchedOn: day.date,
				$or: results.map(({ search }) => ({
					topic: topics.get(search.topicKey)!.id,
					district: search.district,
				})),
			});
		}
		for (const { search, top } of results) {
			summary.returned++;
			top.forEach((item, i) => {
				const venue = venueIds.get(item.placeId!);
				this.em.create(DishSearchRank, {
					city,
					topic: topics.get(search.topicKey)!,
					district: search.district,
					searchedOn: day.date,
					year: day.year,
					month: day.month,
					monthOfYear: day.monthOfYear,
					dayOfMonth: day.dayOfMonth,
					dayOfYear: day.dayOfYear,
					isoYear: day.isoYear,
					isoWeek: day.isoWeek,
					weekday: day.weekday,
					rank: i + 1,
					placeId: item.placeId!,
					name: item.title ?? '',
					rating: item.totalScore ?? null,
					reviewsCount: item.reviewsCount ?? null,
					venue: venue ?? null,
					searchedAt: now,
				});
				summary.places++;
				if (venue) summary.linked++;
			});
		}
		await this.em.flush();
		this.logger.log(
			`Dish searches ${city.name} ${day.date}: ${summary.returned} of ${summary.searches} came back, ${summary.places} places (${summary.linked} our venues)`,
		);
		return summary;
	}

	/** Each city's newest snapshot date, for the cron's due check; a city without one is absent. */
	async newestSnapshots(cityIds: string[]): Promise<Map<string, string>> {
		if (!cityIds.length) return new Map();
		const rows = (await this.em.getConnection().execute(
			`select city_id, max(searched_on)::text as searched_on from dish_search_ranks
			where city_id in (${cityIds.map(() => '?').join(', ')}) group by city_id`,
			cityIds,
		)) as { city_id: string; searched_on: string }[];
		return new Map(rows.map(r => [r.city_id, r.searched_on]));
	}

	/**
	 * One dish's searches in one snapshot of the city (`searchedOn`, else the newest), a district
	 * each, each place with its rank in the snapshot before.
	 */
	async forTopic(
		cityId: string,
		topicKey: string,
		searchedOn?: string,
	): Promise<TopicDishSearches> {
		const snapshots = (
			(await this.em.getConnection().execute(
				`select distinct d.searched_on::text as searched_on from dish_search_ranks d
				join food_topics t on t.id = d.topic_id
				where d.city_id = ? and t.key = ? order by 1 desc limit ?`,
				[cityId, topicKey, TOPIC_SNAPSHOTS],
			)) as { searched_on: string }[]
		).map(r => r.searched_on);
		const picked = searchedOn ?? snapshots[0];
		const at = snapshots.indexOf(picked);
		if (at < 0) return { snapshots, districts: [] };
		const previousOn = snapshots[at + 1];

		const rows = await this.em.find(
			DishSearchRank,
			{
				city: cityId,
				topic: { key: topicKey },
				searchedOn: { $in: previousOn ? [picked, previousOn] : [picked] },
			},
			{
				fields: [
					'district',
					'searchedOn',
					'rank',
					'placeId',
					'name',
					'rating',
					'reviewsCount',
					'venue',
					'searchedAt',
				],
			},
		);
		return {
			snapshots,
			searchedOn: picked,
			...(previousOn && { previousOn }),
			districts: dishSearchTable(
				rows.map(r => ({
					district: r.district,
					searchedOn: r.searchedOn,
					rank: r.rank,
					placeId: r.placeId,
					name: r.name,
					rating: r.rating,
					reviewsCount: r.reviewsCount,
					venueId: r.venue?.id ?? null,
					searchedAt: r.searchedAt,
				})),
				picked,
				previousOn,
			),
		};
	}

	/**
	 * A venue's places on the dish searches of its city's last `count` snapshots: each search it
	 * was in the top ten of at least once, with its rank in each snapshot that search ran in
	 * (absent: searched, not in the top ten).
	 */
	async forVenue(venueId: string, count = 6): Promise<VenueDishSearches> {
		const venue = await this.em.findOneOrFail(Venue, venueId, { fields: ['city'] });
		const snapshots = (
			(await this.em
				.getConnection()
				.execute(
					'select distinct searched_on::text as searched_on from dish_search_ranks where city_id = ? order by 1 desc limit ?',
					[venue.city.id, count],
				)) as { searched_on: string }[]
		).map(r => r.searched_on);
		if (!snapshots.length) return { snapshots: [], searches: [] };

		const own = await this.em.find(
			DishSearchRank,
			{ venue: venueId, searchedOn: { $in: snapshots } },
			{ populate: ['topic'] },
		);
		if (!own.length) return { snapshots, searches: [] };
		const key = (topicId: string, district: string) => `${topicId}|${district}`;
		const pairs = _.uniqBy(own, r => key(r.topic.id, r.district));
		// Which of those searches ran in each snapshot: every search that came back has a first place
		const ran = new Set(
			(
				await this.em.find(
					DishSearchRank,
					{
						city: venue.city.id,
						searchedOn: { $in: snapshots },
						rank: 1,
						topic: { $in: _.uniq(pairs.map(r => r.topic.id)) },
					},
					{ fields: ['topic', 'district', 'searchedOn'] },
				)
			).map(r => `${key(r.topic.id, r.district)}|${r.searchedOn}`),
		);
		const rankOf = new Map(
			own.map(r => [`${key(r.topic.id, r.district)}|${r.searchedOn}`, r.rank]),
		);

		const searches = pairs.map(pair => ({
			topicKey: pair.topic.key,
			topicLabel: pair.topic.label,
			district: pair.district,
			ranks: snapshots
				.filter(on => ran.has(`${key(pair.topic.id, pair.district)}|${on}`))
				.map(on => {
					const rank = rankOf.get(`${key(pair.topic.id, pair.district)}|${on}`);
					return { searchedOn: on, ...(rank !== undefined && { rank }) };
				}),
		}));
		// The latest snapshot it ranked in first, then its best rank there
		const latest = (s: (typeof searches)[number]) => s.ranks.find(r => r.rank !== undefined)!;
		return {
			snapshots,
			searches: _.orderBy(
				searches,
				[s => latest(s).searchedOn, s => latest(s).rank],
				['desc', 'asc'],
			),
		};
	}
}
