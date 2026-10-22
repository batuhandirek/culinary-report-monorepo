import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleInit,
} from '@nestjs/common';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import {
	FoodTopic,
	FoodTopicKindEnum,
} from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { SitemapService } from 'src/modules/sitemap/services/sitemap.service.js';
import {
	SearchInterestService,
	TRENDS_FOOD_CATEGORY,
	trendsGeo,
} from 'src/modules/trends/services/search-interest.service.js';
import { lastDayOf, monthsUpTo, trendsQuery } from 'src/modules/trends/util/search-interest.js';
import {
	countTopicMentions,
	TOPIC_MENTIONS_SQL,
	type TopicMentionRow,
} from 'src/modules/trends/util/topic-mentions.js';
import { VenueStatusChangeService } from 'src/modules/venues/services/venue-status-change.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { runPool } from 'src/shared/util/pool.js';

import {
	ANCHOR_TOPIC_KEY,
	ANCHORED_WINDOW_MONTHS,
	COMPARE_CONCURRENCY,
	COMPARE_GROUP_CAP_USD,
	COMPARE_GROUP_SIZE,
	COMPARE_REPORT_USD,
	PULL_STALE_MS,
	TRENDS_COMPARE_ACTOR,
} from '../constants/food-trends.constant.js';
import { FoodTrendsReport } from '../entities/food-trends-report.entity.js';
import type { AnchoredSearchLevels } from '../interfaces/food-trends.interface.js';
import { FoodTrendsSearchPullJob } from '../jobs/food-trends-search-pull.job.js';
import {
	anchoredLevels,
	type CompareGroupResult,
	compareGroups,
	type CompareTerm,
	groupSeries,
	type TrendsCompareItem,
} from '../util/anchored-levels.js';
import {
	computeFoodTrends,
	type FoodTrendsRelatedRow,
	type FoodTrendsTopicInfo,
} from '../util/food-trends.js';
import { quarterBefore, quarterEnd, quarterMonths } from '../util/quarter.js';

/** What an anchored pull of a city would ask for, before anyone pays for it. */
export interface FoodTrendsPullEstimate {
	topics: number;
	groups: number;
	estimatedUsd: number;
}

/**
 * The one entry point for a city's public quarter of food trends: `queuePull` / `pullSearches`
 * (the paid anchored Google Trends pull, an admin's), `build` (free: stored data as it stands),
 * `publish` and `unpublish` (an admin's, never automatic). Reads trends, food topics, venues'
 * openings and cities; none of them import it.
 */
@Injectable()
export class FoodTrendsReportService implements OnModuleInit {
	private readonly logger = new Logger(FoodTrendsReportService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly foodTopicService: FoodTopicService,
		private readonly searchInterestService: SearchInterestService,
		private readonly venueStatusChangeService: VenueStatusChangeService,
		private readonly apifyService: ApifyService,
		private readonly pgBossService: PgBossService,
		private readonly sitemapService: SitemapService,
	) {}

	// Published quarters only: an unpublished one answers 404 and is never submitted
	onModuleInit() {
		const published = { publishedAt: { $ne: null } };
		this.sitemapService.register({
			name: 'foodtrends',
			count: () => this.em.fork().count(FoodTrendsReport, published),
			list: async (offset, limit) => {
				const rows = await this.em.fork().find(FoodTrendsReport, published, {
					populate: ['city'],
					orderBy: { quarter: QueryOrder.ASC, id: QueryOrder.ASC },
					offset,
					limit,
				});
				return rows.map(r => ({
					path: `/${r.city.slug}/trends/${r.quarter}`,
					updatedAt: r.updatedAt.toISOString(),
				}));
			},
		});
	}

	/** The stored quarter, built or not; null when nothing was pulled or built for it. */
	async find(cityId: string, quarter: string): Promise<FoodTrendsReport | null> {
		return this.em.findOne(FoodTrendsReport, { city: cityId, quarter }, { populate: ['city'] });
	}

	/** Every stored quarter of a city, newest first. */
	async quarters(cityId: string): Promise<FoodTrendsReport[]> {
		return this.em.find(
			FoodTrendsReport,
			{ city: cityId },
			{ orderBy: { quarter: QueryOrder.DESC } },
		);
	}

	/** What the public page reads: the published quarter of the city with this slug, else 404. */
	async published(citySlug: string, quarter: string): Promise<FoodTrendsReport> {
		const report = await this.em.findOne(
			FoodTrendsReport,
			{ city: { slug: citySlug }, quarter, publishedAt: { $ne: null } },
			{ populate: ['city'] },
		);
		if (!report?.data)
			throw new NotFoundException('No published food trends for this city and quarter');
		return report;
	}

	/** The topics an anchored pull compares: every searched kind of food, the anchor first. */
	private async compareTerms(): Promise<{ anchor: CompareTerm; topics: CompareTerm[] }> {
		const searched = (await this.foodTopicService.searched()).filter(
			t => t.kind !== FoodTopicKindEnum.FORMAT,
		);
		const term = (t: FoodTopic): CompareTerm => ({
			key: t.key,
			query: t.trendsTopicId || trendsQuery(t.trendsQuery!),
		});
		const anchor = searched.find(t => t.key === ANCHOR_TOPIC_KEY);
		if (!anchor) {
			throw new BadRequestException(
				`The anchor topic "${ANCHOR_TOPIC_KEY}" has no Google Trends id or query`,
			);
		}
		return { anchor: term(anchor), topics: searched.filter(t => t !== anchor).map(term) };
	}

	async pullEstimate(): Promise<FoodTrendsPullEstimate> {
		const { anchor, topics } = await this.compareTerms();
		const groups = compareGroups(anchor, topics);
		const reports = groups.reduce((n, g) => n + g.length, 0);
		return {
			topics: topics.length + 1,
			groups: groups.length,
			estimatedUsd: Math.round(reports * COMPARE_REPORT_USD * 100) / 100,
		};
	}

	/**
	 * Queues the anchored pull (`FoodTrendsSearchPullJob`, never retried). Only for a quarter that
	 * is over, and not while one is queued or running (409). Flushes.
	 */
	async queuePull(cityId: string, quarter: string, now = new Date()): Promise<FoodTrendsReport> {
		const city = await this.cityService.getById(cityId);
		if (quarterEnd(quarter) > now)
			throw new BadRequestException('A quarter is pulled once it is over');
		await this.compareTerms();
		const report =
			(await this.find(city.id, quarter)) ??
			this.em.create(FoodTrendsReport, { city, quarter });
		const pull = report.searchPull;
		if (
			pull &&
			(pull.state === 'queued' || pull.state === 'running') &&
			now.getTime() - new Date(pull.requestedAt).getTime() < PULL_STALE_MS
		) {
			throw new ConflictException('A pull for this quarter is already under way');
		}
		report.searchPull = { state: 'queued', requestedAt: now.toISOString() };
		await this.em.flush();
		await this.pgBossService.sendJob(
			FoodTrendsSearchPullJob.jobName,
			new FoodTrendsSearchPullJob({ cityId: city.id, quarter }),
		);
		return report;
	}

	/**
	 * The anchored pull: every searched kind of food in groups of five with the anchor, over the
	 * two years ending with the quarter, in the city's Trends region and Food & Drink, one actor run
	 * a group (`ApifyService.runActor`, each capped). Each group is rescaled to the anchor's mean
	 * (`anchoredLevels`) and the whole is stored on the quarter's row. A run that fails leaves its
	 * topics out; a pull with no usable group keeps the stored levels and is marked failed.
	 */
	async pullSearches(
		cityId: string,
		quarter: string,
		now = new Date(),
	): Promise<FoodTrendsReport> {
		const city = await this.cityService.getById(cityId);
		const report =
			(await this.find(city.id, quarter)) ??
			this.em.create(FoodTrendsReport, { city, quarter });
		const requestedAt = report.searchPull?.requestedAt ?? now.toISOString();
		report.searchPull = { state: 'running', requestedAt };
		await this.em.flush();

		const finish = async (state: 'done' | 'failed', note: string) => {
			report.searchPull = { state, requestedAt, finishedAt: new Date().toISOString(), note };
			await this.em.flush();
		};
		try {
			const { anchor, topics } = await this.compareTerms();
			const last = quarterMonths(quarter)[2];
			const months = monthsUpTo(last, ANCHORED_WINDOW_MONTHS);
			const geo = trendsGeo(city);
			const groups = compareGroups(anchor, topics, COMPARE_GROUP_SIZE);
			const results: CompareGroupResult[] = [];
			let failed = 0;
			await runPool(
				groups.map((terms, i) => ({ terms, i })),
				COMPARE_CONCURRENCY,
				async ({ terms, i }) => {
					const items = await this.apifyService.runActor<TrendsCompareItem>(
						TRENDS_COMPARE_ACTOR,
						{
							searchTerms: terms.map(t => t.query),
							compare: true,
							geo,
							timeRange: `${months[0]}-01 ${lastDayOf(last)}`,
							category: Number(TRENDS_FOOD_CATEGORY),
							surfaces: ['interestOverTime'],
						},
						{
							maxCostUsd: COMPARE_GROUP_CAP_USD,
							purpose: `Google Trends compare ${city.slug} ${quarter} ${i + 1}/${groups.length}`,
						},
					);
					results[i] = { terms, series: groupSeries(terms, items) };
				},
				(_item, error) => {
					failed++;
					this.logger.warn(
						`Food trends pull ${city.slug} ${quarter}: a group failed: ${error.message}`,
					);
				},
			);
			const fetched = results.filter(Boolean);
			const { levels, usableGroups } = anchoredLevels(anchor.key, fetched, months);
			const failedNote = failed ? `, ${failed} runs failed` : '';
			if (!usableGroups) {
				await finish(
					'failed',
					`No group came back with ${anchor.key}'s searches${failedNote}`,
				);
				return report;
			}
			const withData = Object.values(levels).filter(line =>
				line.some(v => v !== null),
			).length;
			const stored: AnchoredSearchLevels = {
				anchor: anchor.key,
				geo,
				category: TRENDS_FOOD_CATEGORY,
				months,
				pulledAt: new Date().toISOString(),
				groups: groups.length,
				usableGroups,
				levels,
			};
			report.searchLevels = stored;
			await finish(
				'done',
				`${usableGroups} of ${groups.length} groups, ${withData} of ${topics.length + 1} topics with data${failedNote}`,
			);
			this.logger.log(`Food trends pull ${city.slug} ${quarter}: ${report.searchPull!.note}`);
			return report;
		} catch (e) {
			await finish('failed', (e as Error).message);
			throw e;
		}
	}

	/**
	 * Computes the quarter from what is stored now and keeps it, replacing an earlier build (a
	 * published quarter stays published with the new figures). Free. Flushes.
	 */
	async build(cityId: string, quarter: string, now = new Date()): Promise<FoodTrendsReport> {
		const city = await this.cityService.getById(cityId);
		const months = quarterMonths(quarter);
		const last = months[2];
		const report =
			(await this.find(city.id, quarter)) ??
			this.em.create(FoodTrendsReport, { city, quarter });

		const [all, index] = [
			await this.foodTopicService.all(),
			await this.foodTopicService.index(),
		];
		const topics = new Map<string, FoodTrendsTopicInfo>(
			all.map(t => [t.key, { key: t.key, label: t.label, kind: t.kind }]),
		);

		const prevFirst = quarterMonths(quarterBefore(quarter))[0];
		const mentionRows = await this.em
			.getConnection()
			.execute<TopicMentionRow[]>(TOPIC_MENTIONS_SQL, [
				city.id,
				monthRange(prevFirst).start,
				monthRange(last).end,
			]);
		const mentions = countTopicMentions(mentionRows, index);

		const table = await this.searchInterestService.table(city.id, last);
		const relatedRows: FoodTrendsRelatedRow[] = table.topics.flatMap(row =>
			row.topicKind === FoodTopicKindEnum.FORMAT ?
				[]
			:	(row.related?.rising ?? []).map(q => ({
					topic: row.label,
					query: q.query,
					value: q.value,
					...(q.breakout && { breakout: true }),
				})),
		);

		const openings = await this.venueStatusChangeService.quarter(city.id, last);

		report.data = computeFoodTrends({
			quarter,
			topics,
			levels: report.searchLevels,
			related: { month: last, rows: relatedRows },
			mentions,
			openings,
			doNotListVenues: city.doNotListVenues,
		});
		report.builtAt = now;
		await this.em.flush();
		return report;
	}

	/** Makes the quarter public. Only a built quarter that is over. Flushes. */
	async publish(id: string, now = new Date()): Promise<FoodTrendsReport> {
		const report = await this.em.findOneOrFail(
			FoodTrendsReport,
			{ id },
			{ populate: ['city'] },
		);
		if (!report.data) throw new BadRequestException('Build the quarter before publishing it');
		if (quarterEnd(report.quarter) > now) {
			throw new BadRequestException('A quarter is published once it is over');
		}
		report.publishedAt ??= now;
		await this.em.flush();
		return report;
	}

	/** Takes the quarter off the site and out of the sitemap. Flushes. */
	async unpublish(id: string): Promise<FoodTrendsReport> {
		const report = await this.em.findOneOrFail(
			FoodTrendsReport,
			{ id },
			{ populate: ['city'] },
		);
		report.publishedAt = null;
		await this.em.flush();
		return report;
	}
}
