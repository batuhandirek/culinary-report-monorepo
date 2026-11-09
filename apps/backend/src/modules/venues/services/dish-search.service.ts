import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import {
	GOOGLE_PLACES_MIN_CAP_USD,
	type GooglePlaceItem,
} from 'src/modules/apify/actors/google-places.actor.js';
import { GOOGLE_PLACE_USD } from 'src/modules/apify/actors/google-places.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { districtNames } from 'src/modules/cities/util/city.js';
import { nearCity, orderedPlaces } from 'src/modules/pipeline/atoms/places/util/places-search.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';

import { DishSearchRank } from '../entities/dish-search-rank.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	DISH_SEARCH_DEPTH,
	dishesWithinBudget,
	type DishSearchDistrict,
	dishSearches,
	type DishSearchSnapshotRow,
	dishSearchTable,
	isSearchedTopic,
} from '../util/dish-searches.js';
import { type CalendarDay, calendarDay } from '../util/week.js';

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

/** What `planSweep` hands the `dish-searches` workflow: one Google Maps run a search, from a map of the city */
export interface DishSweepPlan {
	/** The city's local day the snapshot is dated */
	searchedOn: string;
	/** Its calendar parts, split out for the rows */
	day: CalendarDay;
	searches: { query: string; topicKey: string; district: string }[];
	/** Places kept per search (`DISH_SEARCH_DEPTH`) */
	perQuery: number;
	/** One run's cap: the actor's floor, else half again what `perQuery` places cost */
	capUsd: number;
	dishes: number;
	districts: number;
	/** Topics the budget did not cover */
	notCovered: number;
}

/** One search's run as the workflow hands it back: its stored items by `recordId` and the venues kept, or why it failed */
export type DishSearchRunResult =
	| { query: string; recordId: string; venueIds: Record<string, string> }
	| { query: string; failed: string };

export interface DishSweepSummary {
	searchedOn: string;
	dishes: number;
	districts: number;
	searches: number;
	returned: number;
	places: number;
	linked: number;
	notCovered: number;
	failed: number;
}

/**
 * Who Google Maps puts first for each food in each district ("pasta Mitte Berlin", "vietnamese
 * food Mitte Berlin", "cafe Mitte Berlin"): every searched food topic (`isSearchedTopic`: dishes,
 * cuisines, kinds of place, meals, diets, drinks) × every district of the city, the top ten each,
 * kept as a dated snapshot of that day's rankings (`TRACK_DISH_SEARCHES`, every
 * `City.dishSearchEveryDays`). The `dish-searches` workflow plans the sweep here (`planSweep`),
 * runs one `places.run` a search (the actor outputs a place once a run, so a shared run would
 * leave a place out of every search after the first that found it; each from a map of the city,
 * the places saved as venues with the day's rating) and stores the ranks here (`saveSweep`); places
 * far from the city are left out (`nearCity`).
 */
@Injectable()
export class DishSearchService {
	private readonly logger = new Logger(DishSearchService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly topicService: TopicService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	/**
	 * Today's snapshot planned (the city's local date): every searched topic in every district of
	 * the city, as many topics as the budget covers (the ones most of the city's open venues are
	 * tagged with first, whatever their kind) and never more searches than it covers at
	 * `DISH_SEARCH_DEPTH` places each.
	 */
	async planSweep(city: City, budgetUsd: number, now = new Date()): Promise<DishSweepPlan> {
		const day = calendarDay(now, city.timezone);
		const districts = districtNames(city);
		const served = await this.venueTopicService.venueCounts(city.id);
		const dishes = _.orderBy(
			(await this.topicService.all()).filter(isSearchedTopic),
			[t => served.get(t.key) ?? 0, t => t.key],
			['desc', 'asc'],
		);
		const planned = dishes.slice(0, dishesWithinBudget(budgetUsd, districts.length));
		const covered = Math.max(0, Math.floor(budgetUsd / (DISH_SEARCH_DEPTH * GOOGLE_PLACE_USD)));
		const searches = dishSearches(planned, districts, city.name)
			.slice(0, covered)
			.map(s => ({ query: s.text, topicKey: s.topicKey, district: s.district }));
		return {
			searchedOn: day.date,
			day,
			searches,
			perQuery: DISH_SEARCH_DEPTH,
			capUsd: Math.max(GOOGLE_PLACES_MIN_CAP_USD, DISH_SEARCH_DEPTH * GOOGLE_PLACE_USD * 1.5),
			dishes: planned.length,
			districts: districts.length,
			notCovered: dishes.length - planned.length,
		};
	}

	/**
	 * The sweep's runs stored: each search's top ten in Google's order (each run's items read from
	 * its row), replacing that day's rows of each search that came back. A search that came back
	 * empty (failed, or cut by the cap) stores nothing; the step fails only when every run did.
	 * Flushes.
	 */
	async saveSweep(
		city: City,
		plan: DishSweepPlan,
		results: DishSearchRunResult[],
		now = new Date(),
	): Promise<DishSweepSummary> {
		const summary: DishSweepSummary = {
			searchedOn: plan.searchedOn,
			dishes: plan.dishes,
			districts: plan.districts,
			searches: plan.searches.length,
			returned: 0,
			places: 0,
			linked: 0,
			notCovered: plan.notCovered,
			failed: 0,
		};
		const failed = results.filter(
			(r): r is Extract<DishSearchRunResult, { failed: string }> => 'failed' in r,
		);
		const came = results.filter(
			(r): r is Extract<DishSearchRunResult, { recordId: string }> => 'recordId' in r,
		);
		summary.failed = failed.length;
		// Some failed runs leave their searches out of the snapshot; none coming back fails the step
		if (failed.length && !came.length)
			throw new Error(`Every dish search failed: ${failed[0].failed}`);
		if (!plan.searches.length) return summary;

		const topics = new Map((await this.topicService.all()).map(t => [t.key, t]));
		const bySearch = new Map(plan.searches.map(s => [s.query, s]));
		const rows: {
			search: DishSweepPlan['searches'][number];
			top: GooglePlaceItem[];
			venueIds: Record<string, string>;
		}[] = [];
		for (const run of came) {
			const search = bySearch.get(run.query);
			if (!search) continue;
			const items = await this.apifyService.storedItems<GooglePlaceItem>(run.recordId);
			// Far-away places Google mixed in are no guest's in the city
			const top = orderedPlaces(items.filter(i => nearCity(i, city))).slice(0, plan.perQuery);
			if (top.length) rows.push({ search, top, venueIds: run.venueIds });
		}
		if (rows.length) {
			await this.em.nativeDelete(DishSearchRank, {
				city: city.id,
				searchedOn: plan.searchedOn,
				$or: rows.map(({ search }) => ({
					topic: topics.get(search.topicKey)!.id,
					district: search.district,
				})),
			});
		}
		for (const { search, top, venueIds } of rows) {
			summary.returned++;
			top.forEach((item, i) => {
				const venueId = venueIds[item.placeId!];
				this.em.create(DishSearchRank, {
					city,
					topic: topics.get(search.topicKey)!,
					district: search.district,
					searchedOn: plan.searchedOn,
					year: plan.day.year,
					month: plan.day.month,
					monthOfYear: plan.day.monthOfYear,
					dayOfMonth: plan.day.dayOfMonth,
					dayOfYear: plan.day.dayOfYear,
					isoYear: plan.day.isoYear,
					isoWeek: plan.day.isoWeek,
					weekday: plan.day.weekday,
					rank: i + 1,
					placeId: item.placeId!,
					name: item.title ?? '',
					rating: item.totalScore ?? null,
					reviewsCount: item.reviewsCount ?? null,
					venue: venueId ?? null,
					searchedAt: now,
				});
				summary.places++;
				if (venueId) summary.linked++;
			});
		}
		await this.em.flush();
		this.logger.log(
			`Dish searches ${city.name} ${plan.searchedOn}: ${summary.returned} of ${summary.searches} came back, ${summary.places} places (${summary.linked} our venues)${failed.length ? `, ${failed.length} runs failed (${failed[0].failed})` : ''}`,
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
				join topics t on t.id = d.topic_id
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
	 * One district's searches of these topics in the city's snapshots from `from` to `to`
	 * (`YYYY-MM-DD`, both included), a row a place: what a report reads a branch's searches from.
	 */
	async inDistrict(
		cityId: string,
		district: string,
		topicKeys: string[],
		from: string,
		to: string,
	): Promise<DishSearchSnapshotRow[]> {
		if (!topicKeys.length) return [];
		const rows = await this.em.find(
			DishSearchRank,
			{
				city: cityId,
				district,
				topic: { key: { $in: topicKeys } },
				searchedOn: { $gte: from, $lte: to },
			},
			{ populate: ['topic'], orderBy: { searchedOn: 'desc', rank: 'asc' } },
		);
		return rows.map(r => ({
			searchedOn: r.searchedOn,
			topicKey: r.topic.key,
			topicKind: r.topic.kind,
			rank: r.rank,
			placeId: r.placeId,
			name: r.name,
			rating: r.rating,
			reviewsCount: r.reviewsCount,
		}));
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
