import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	GOOGLE_TRENDS_ACTOR,
	type GoogleTrendsInput,
	type GoogleTrendsItem,
} from 'src/modules/apify/actors/google-trends.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { Topic, TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { TopicIndex } from 'src/modules/topics/util/topics.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import { TrendRelatedQuery } from '../entities/trend-related-query.entity.js';
import {
	SearchTermKindEnum,
	TrendSearchInterest,
} from '../entities/trend-search-interest.entity.js';
import {
	change,
	lastDayOf,
	monthlyInterest,
	monthsUpTo,
	relatedQueries,
	SearchDelta,
	splitTrendsBudget,
	termKey,
	trendsQuery,
} from '../util/search-interest.js';
import {
	countTopicMentions,
	TOPIC_MENTIONS_SQL,
	TopicMentionRow,
	topicShares,
} from '../util/topic-mentions.js';

// The months a pull covers and the page shows, ending with the month asked for
export const SEARCH_WINDOW_MONTHS = 12;
// Google Trends' Food & Drink category. Topics are searched in it (it strips "thai massage"
// from Thai cuisine); brand names are not, as it drops most weeks of a small place's searches
export const TRENDS_FOOD_CATEGORY = '71';
export const TRENDS_ALL_CATEGORIES = '0';

/** One searched term over the window, oldest month first. */
export interface SearchInterestRow {
	kind: SearchTermKindEnum;
	/** The topic's key or the brand name searched */
	term: string;
	label: string;
	/** Topics: the kind of food it is */
	topicKind?: TopicKindEnum;
	brandId?: string;
	/** Google's 0–100 per month; null where it has too little data */
	interest: (number | null)[];
	/** Topics: share of the city's matched mentions with a topic that name it or a child of it, percent; null without mentions */
	mentionShare?: (number | null)[];
	/** The month against the one before: 0.4 = up 40 %; null when either is unknown */
	searchChange: number | null;
	mentionChange?: number | null;
	/** Google's related queries over the window ending with the month; absent when that pull has none */
	related?: { top: RelatedQuery[]; rising: RelatedQuery[] };
}

/** One of Google's related queries for a term, in Google's order. */
export interface RelatedQuery {
	query: string;
	/** Top: 0–100 against the most searched one. Rising: percent growth (250 = +250 %) */
	value: number;
	/** Rising past +5,000 % */
	breakout?: boolean;
}

export interface SearchInterestTable {
	month: string;
	months: string[];
	/** The Google Trends region the city is searched in */
	geo: string;
	/** By the month's mention share, largest first */
	topics: SearchInterestRow[];
	brands: SearchInterestRow[];
}

/** A term of a pull: what is stored (`term`) and what Google is asked (`query`). */
interface PullTerm {
	kind: SearchTermKindEnum;
	term: string;
	query: string;
	topic: Topic | null;
	brand: Pick<Brand, 'id' | 'name'> | null;
}

/** A term as the plan stores it (plain JSON: the topic and brand by id) */
export interface PlannedTerm {
	kind: SearchTermKindEnum;
	term: string;
	query: string;
	topicId: string | null;
	brandId: string | null;
}

/** One of the pull's two runs: its terms (each its own query, so 100 is its own peak) and the call */
export interface SearchInterestRun {
	terms: PlannedTerm[];
	call: ActorCall<GoogleTrendsInput, GoogleTrendsItem>;
}

/** What `plan` hands the `search-interest` workflow: the topics' run in Food & Drink, the won brands' in all categories */
export interface SearchInterestPlan {
	month: string;
	months: string[];
	topics: SearchInterestRun | null;
	brands: SearchInterestRun | null;
}

/** The runs' records as the workflow hands them to `save`: null for a run that failed */
export interface SearchInterestRecords {
	topics?: string | null;
	brands?: string | null;
}

export interface SearchInterestPullResult {
	terms: number;
	fetched: number;
	withData: number;
	related: number;
}

// Topics a report's city section quotes
const REPORT_SEARCHES = 5;

/** A brand name as people search it: without the tagline Google adds after a dash. */
const searchName = (name: string) => name.split(/\s[-–|]\s/)[0].trim();

/** The Google Trends region of a city: its subdivision when set, else its country. */
export const trendsGeo = (city: Pick<City, 'region' | 'country'>) => city.region || city.country;

/**
 * Google search interest per food topic (and per won brand) in the city's region, next to the
 * topics' share of social mentions. `pull` runs `signalbench/google-trends-scraper` twice per
 * city and month through `ApifyService` (the topics in Food & Drink, then the venues in all
 * categories; each term alone, twelve months back); everything else reads stored rows. The one
 * writer of `TrendSearchInterest` and `TrendRelatedQuery`.
 */
@Injectable()
export class SearchInterestService {
	private readonly logger = new Logger(SearchInterestService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly topicService: TopicService,
	) {}

	/**
	 * The month's pull: every food topic with a Trends id (else its query) in Food & Drink, and the
	 * won brands' names in all categories, each term its own query over the twelve months up to
	 * the month in the city's region (a subdivision, DE-BE, where it has one), the budget split by
	 * terms with each run at the actor's $1 floor (`splitTrendsBudget`).
	 */
	async plan(
		cityId: string,
		month: string,
		{ brands = [], budgetUsd }: { brands?: Pick<Brand, 'id' | 'name'>[]; budgetUsd: number },
	): Promise<SearchInterestPlan> {
		const city = await this.em.findOneOrFail(City, { id: cityId });
		const months = monthsUpTo(month, SEARCH_WINDOW_MONTHS);
		const topicTerms: PlannedTerm[] = (await this.topicService.searched()).map(topic => ({
			kind: SearchTermKindEnum.TOPIC,
			term: topic.key,
			query: topic.trendsTopicId || trendsQuery(topic.trendsQuery!),
			topicId: topic.id,
			brandId: null,
		}));
		const brandTerms: PlannedTerm[] = _.uniqBy(
			brands.map(b => ({
				kind: SearchTermKindEnum.BRAND,
				term: searchName(b.name),
				query: trendsQuery(searchName(b.name)),
				topicId: null,
				brandId: b.id,
			})),
			t => termKey(t.query),
		);
		const caps = splitTrendsBudget(budgetUsd, topicTerms.length, brandTerms.length);
		const run = (
			terms: PlannedTerm[],
			category: string,
			maxCostUsd: number,
			what: string,
		): SearchInterestRun | null =>
			terms.length ?
				{
					terms,
					call: {
						actor: GOOGLE_TRENDS_ACTOR,
						input: {
							searchTerms: terms.map(t => t.query),
							geo: trendsGeo(city),
							customTimeRange: `${months[0]}-01 ${lastDayOf(month)}`,
							category,
							includeInterestOverTime: true,
							includeRelatedQueries: true,
							includeInterestByRegion: false,
							includeRelatedTopics: false,
						},
						maxCostUsd,
						purpose: `Google Trends ${what} ${city.slug} ${month}`,
					},
				}
			:	null;
		return {
			month,
			months,
			topics: run(topicTerms, TRENDS_FOOD_CATEGORY, caps.topics, 'topics'),
			brands: run(brandTerms, TRENDS_ALL_CATEGORIES, caps.brands, 'brands'),
		};
	}

	/**
	 * The runs' items read from their rows and stored (`store`): a term the actor returned nothing
	 * for (the cap stopped it, Google failed it) is not known to have no data, so its stored months
	 * and queries stay as they were; a failed run (`null`) stores nothing.
	 */
	async save(
		cityId: string,
		plan: SearchInterestPlan,
		records: SearchInterestRecords,
	): Promise<SearchInterestPullResult> {
		const city = await this.em.findOneOrFail(City, { id: cityId });
		const total: SearchInterestPullResult = { terms: 0, fetched: 0, withData: 0, related: 0 };
		for (const [run, recordId, what] of [
			[plan.topics, records.topics, 'topics'],
			[plan.brands, records.brands, 'brands'],
		] as const) {
			if (!run) continue;
			total.terms += run.terms.length;
			if (!recordId) continue;
			const items = await this.apifyService.storedItems<GoogleTrendsItem>(recordId);
			const byQuery = new Map(items.map(item => [termKey(item.searchTerm ?? ''), item]));
			const topics = new Map(
				(
					await this.em.find(Topic, {
						id: { $in: run.terms.flatMap(t => (t.topicId ? [t.topicId] : [])) },
					})
				).map(t => [t.id, t]),
			);
			const brands = new Map(
				(
					await this.em.find(Brand, {
						id: { $in: run.terms.flatMap(t => (t.brandId ? [t.brandId] : [])) },
					})
				).map(b => [b.id, b]),
			);
			const fetched = run.terms.flatMap(t => {
				const item = byQuery.get(termKey(t.query));
				if (!item) return [];
				const term: PullTerm & { item: GoogleTrendsItem } = {
					kind: t.kind,
					term: t.term,
					query: t.query,
					topic: t.topicId ? (topics.get(t.topicId) ?? null) : null,
					brand: t.brandId ? (brands.get(t.brandId) ?? null) : null,
					item,
				};
				return [term];
			});
			const stored = await this.store(city, plan.month, plan.months, fetched);
			this.logger.log(
				`${city.name} ${plan.month} ${what}: ${fetched.length} of ${run.terms.length} terms fetched, ${stored.withData} with data, ${stored.related} related queries`,
			);
			total.fetched += fetched.length;
			total.withData += stored.withData;
			total.related += stored.related;
		}
		return total;
	}

	private async store(
		city: City,
		month: string,
		months: string[],
		fetched: (PullTerm & { item: GoogleTrendsItem })[],
	): Promise<{ withData: number; related: number }> {
		let withData = 0;
		let related = 0;
		if (!fetched.length) return { withData, related };
		await this.em.transactional(async em => {
			const existing = await em.find(TrendSearchInterest, {
				city: city.id,
				month: { $in: months },
				$or: fetched.map(t => ({ kind: t.kind, term: t.term })),
			});
			const rows = new Map(existing.map(r => [`${r.kind} ${r.term} ${r.month}`, r]));
			await em.nativeDelete(TrendRelatedQuery, {
				city: city.id,
				month,
				$or: fetched.map(t => ({ kind: t.kind, term: t.term })),
			});
			for (const t of fetched) {
				const brand = t.brand ? em.getReference(Brand, t.brand.id) : null;
				const topic = t.topic ? em.getReference(Topic, t.topic.id) : null;
				const interest = monthlyInterest(t.item.interestOverTime, months);
				if ([...interest.values()].some(v => v !== null)) withData++;
				for (const m of months) {
					const row =
						rows.get(`${t.kind} ${t.term} ${m}`) ??
						em.create(TrendSearchInterest, {
							city,
							kind: t.kind,
							term: t.term,
							month: m,
							topic,
							brand,
						});
					row.interest = interest.get(m) ?? null;
				}
				for (const q of relatedQueries(t.item)) {
					em.create(TrendRelatedQuery, {
						city,
						kind: t.kind,
						term: t.term,
						topic,
						brand,
						month,
						...q,
					});
					related++;
				}
			}
		});
		return { withData, related };
	}

	/** The stored window ending with `month`, topics next to their share of mentions. */
	async table(cityId: string, month: string): Promise<SearchInterestTable> {
		const city = await this.em.findOneOrFail(City, { id: cityId });
		const months = monthsUpTo(month, SEARCH_WINDOW_MONTHS);
		const [stored, index, relatedRows] = await Promise.all([
			this.em.find(
				TrendSearchInterest,
				{ city: cityId, month: { $in: months } },
				{ populate: ['topic'] },
			),
			this.topicService.index(),
			this.em.find(TrendRelatedQuery, { city: cityId, month }, { orderBy: { rank: 'asc' } }),
		]);
		const shares = await this.topicShares(cityId, months, index);
		const related = _.groupBy(relatedRows, r => `${r.kind} ${r.term}`);
		const last = months.length - 1;
		const rows = Object.values(_.groupBy(stored, r => `${r.kind} ${r.term}`)).map(group => {
			const { kind, term, brand, topic } = group[0];
			const byMonth = new Map(group.map(r => [r.month, r.interest ?? null]));
			const interest = months.map(m => byMonth.get(m) ?? null);
			const row: SearchInterestRow = {
				kind,
				term,
				label: topic?.label ?? term,
				...(topic && { topicKind: topic.kind }),
				...(brand && { brandId: brand.id }),
				interest,
				searchChange: change(interest[last], interest[last - 1]),
			};
			const queries = related[`${kind} ${term}`];
			if (queries?.length) {
				const [rising, top] = _.partition(queries, q => q.rising);
				const out = (q: TrendRelatedQuery): RelatedQuery => ({
					query: q.query,
					value: q.value,
					...(q.breakout && { breakout: true }),
				});
				row.related = { top: top.map(out), rising: rising.map(out) };
			}
			if (kind === SearchTermKindEnum.TOPIC) {
				const share = shares.get(topic?.key ?? term) ?? months.map(() => null);
				row.mentionShare = share;
				row.mentionChange = change(share[last], share[last - 1]);
			}
			return row;
		});
		const [topics, brands] = _.partition(rows, r => r.kind === SearchTermKindEnum.TOPIC);
		return {
			month,
			months,
			geo: trendsGeo(city),
			topics: _.sortBy(
				topics,
				r => -(r.mentionShare?.[last] ?? -1),
				r => r.label,
			),
			brands: _.sortBy(brands, r => r.label),
		};
	}

	/**
	 * What a report's city section quotes: up to `REPORT_SEARCHES` topics with Google data for the
	 * month and the one before, the venue's own (the topics `ownCuisine` resolves to) first, then by
	 * mention share. Empty when nothing was pulled.
	 */
	async reportDeltas(cityId: string, month: string, ownCuisine?: string): Promise<SearchDelta[]> {
		const months = monthsUpTo(month, 2);
		const stored = await this.em.find(
			TrendSearchInterest,
			{ city: cityId, kind: SearchTermKindEnum.TOPIC, month: { $in: months } },
			{ populate: ['topic'] },
		);
		if (!stored.length) return [];
		const index = await this.topicService.index();
		// The venue's own kind of food is a topic key already
		const own = new Set(ownCuisine && index.get(ownCuisine) ? [ownCuisine] : []);
		const shares = await this.topicShares(cityId, months, index);
		const rows = Object.values(_.groupBy(stored, 'term')).flatMap(group => {
			const key = group[0].topic?.key ?? group[0].term;
			const interest = months.map(m => group.find(r => r.month === m)?.interest ?? null);
			if (interest[1] === null) return [];
			const share = shares.get(key) ?? [null, null];
			return [
				{
					key,
					label: group[0].topic?.label ?? key,
					interest: interest[1],
					...(interest[0] !== null && { prevInterest: interest[0] }),
					...(change(interest[1], interest[0]) !== null && {
						searchChange: change(interest[1], interest[0])!,
					}),
					...(share[1] !== null && { share: share[1] }),
					...(share[0] !== null && { prevShare: share[0] }),
					...(change(share[1], share[0]) !== null && {
						mentionChange: change(share[1], share[0])!,
					}),
				} satisfies SearchDelta,
			];
		});
		return _.sortBy(
			rows,
			r => (own.has(r.key) ? 0 : 1),
			r => -(r.share ?? -1),
		).slice(0, REPORT_SEARCHES);
	}

	/**
	 * Per topic key, its share of the city's matched mentions with a topic (posts by others) per
	 * month (`countTopicMentions`, `topicShares`): children counted, so shares don't sum to 100.
	 */
	private async topicShares(
		cityId: string,
		months: string[],
		index: TopicIndex,
	): Promise<Map<string, (number | null)[]>> {
		const rows = await this.em
			.getConnection()
			.execute<TopicMentionRow[]>(TOPIC_MENTIONS_SQL, [
				cityId,
				monthRange(months[0]).start,
				monthRange(months.at(-1)!).end,
			]);
		const counts = countTopicMentions(rows, index);
		return new Map(
			[...counts.byTopic.keys()].map(key => [key, topicShares(counts, key, months)]),
		);
	}
}
