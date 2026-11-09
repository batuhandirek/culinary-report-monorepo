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

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	GOOGLE_TRENDS_COMPARE_ACTOR,
	type GoogleTrendsCompareInput,
	type GoogleTrendsCompareItem,
} from 'src/modules/apify/actors/google-trends-compare.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { SitemapService } from 'src/modules/sitemap/services/sitemap.service.js';
import { Topic, TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
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

import {
	ANCHOR_TOPIC_KEY,
	ANCHORED_WINDOW_MONTHS,
	COMPARE_GROUP_CAP_USD,
	COMPARE_GROUP_SIZE,
	COMPARE_REPORT_USD,
	FOOD_TRENDS_PULL_WORKFLOW,
	PULL_STALE_MS,
} from '../constants/food-trends.constant.js';
import { FoodTrendsReport } from '../entities/food-trends-report.entity.js';
import type { AnchoredSearchLevels } from '../interfaces/food-trends.interface.js';
import { FOOD_TRENDS_PULL_QUEUE } from '../queues/food-trends-pull.queue.js';
import {
	anchoredLevels,
	type CompareGroupResult,
	compareGroups,
	type CompareTerm,
	groupSeries,
} from '../util/anchored-levels.js';
import {
	computeFoodTrends,
	type FoodTrendsRelatedRow,
	type FoodTrendsTopicInfo,
} from '../util/food-trends.js';
import { quarterBefore, quarterEnd, quarterMonths } from '../util/quarter.js';

/** What `startPull` hands the pull workflow: the anchor, the groups and one actor run each */
export interface FoodTrendsPullPlan {
	anchor: CompareTerm;
	/** Searched kinds of food beside the anchor */
	topics: number;
	groups: CompareTerm[][];
	months: string[];
	geo: string;
	/** When the pull was asked for (ISO), kept on the report's `searchPull` */
	requestedAt: string;
	/** One run per group, in the groups' order */
	calls: ActorCall<GoogleTrendsCompareInput, GoogleTrendsCompareItem>[];
}

/** What an anchored pull of a city would ask for, before anyone pays for it. */
export interface FoodTrendsPullEstimate {
	topics: number;
	groups: number;
	estimatedUsd: number;
}

/**
 * The one entry point for a city's public quarter of food trends: `queuePull` (the
 * `FoodTrendsPullWorkflow`, whose steps are `startPull` and `savePull`)
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
		private readonly topicService: TopicService,
		private readonly searchInterestService: SearchInterestService,
		private readonly venueStatusChangeService: VenueStatusChangeService,
		private readonly apifyService: ApifyService,
		private readonly durable: DurableWorkflowsService,
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
		const searched = (await this.topicService.searched()).filter(
			t => t.kind !== TopicKindEnum.FORMAT,
		);
		const term = (t: Topic): CompareTerm => ({
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
	 * Queues the anchored pull (`FoodTrendsPullWorkflow.pull`, by name on its queue), `high`: an
	 * admin asked and waits for it, so its Trends runs pass the pipeline's. Only for a quarter that
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
		// One pull of a quarter in flight: a second ask while it runs gets that run
		await this.durable.enqueue(FOOD_TRENDS_PULL_WORKFLOW, [city.id, quarter], {
			queue: FOOD_TRENDS_PULL_QUEUE,
			dedupe: `${city.id}:${quarter}`,
			onDuplicate: 'return-existing',
			priority: 'high',
		});
		return report;
	}

	/**
	 * The pull's first step (`FoodTrendsPullWorkflow.plan`): the report's pull marked running, then
	 * every searched kind of food (kinds of place left out) in groups of `COMPARE_GROUP_SIZE` with
	 * the anchor, over the `ANCHORED_WINDOW_MONTHS` ending with the quarter, in the city's region
	 * and Food & Drink, each group one actor run capped at `COMPARE_GROUP_CAP_USD`. Flushes.
	 */
	async startPull(
		cityId: string,
		quarter: string,
		now = new Date(),
	): Promise<FoodTrendsPullPlan> {
		const city = await this.cityService.getById(cityId);
		const report =
			(await this.find(city.id, quarter)) ??
			this.em.create(FoodTrendsReport, { city, quarter });
		const requestedAt = report.searchPull?.requestedAt ?? now.toISOString();
		report.searchPull = { state: 'running', requestedAt };
		await this.em.flush();
		const { anchor, topics } = await this.compareTerms();
		const last = quarterMonths(quarter)[2];
		const months = monthsUpTo(last, ANCHORED_WINDOW_MONTHS);
		const geo = trendsGeo(city);
		const groups = compareGroups(anchor, topics, COMPARE_GROUP_SIZE);
		return {
			anchor,
			topics: topics.length,
			groups,
			months,
			geo,
			requestedAt,
			calls: groups.map((terms, i) => ({
				actor: GOOGLE_TRENDS_COMPARE_ACTOR,
				input: {
					searchTerms: terms.map(t => t.query),
					compare: true,
					geo,
					timeRange: `${months[0]}-01 ${lastDayOf(last)}`,
					category: Number(TRENDS_FOOD_CATEGORY),
					surfaces: ['interestOverTime'],
				},
				maxCostUsd: COMPARE_GROUP_CAP_USD,
				purpose: `Google Trends compare ${city.slug} ${quarter} ${i + 1}/${groups.length}`,
			})),
		};
	}

	/**
	 * The pull's last step: each group's items read from its run's row (a failed run, `null`, is a
	 * group left out), the groups rescaled onto the anchor (`anchoredLevels`) and stored, the pull
	 * marked done, or failed when no group came back with the anchor's searches (the stored levels
	 * kept). Flushes; the pull's note.
	 */
	async savePull(
		cityId: string,
		quarter: string,
		plan: FoodTrendsPullPlan,
		recordIds: (string | null)[],
	): Promise<string> {
		const city = await this.cityService.getById(cityId);
		const report = await this.em.findOneOrFail(FoodTrendsReport, { city: city.id, quarter });
		const finish = async (state: 'done' | 'failed', note: string) => {
			report.searchPull = {
				state,
				requestedAt: plan.requestedAt,
				finishedAt: new Date().toISOString(),
				note,
			};
			await this.em.flush();
			return note;
		};
		const fetched: CompareGroupResult[] = [];
		let failed = 0;
		for (const [i, terms] of plan.groups.entries()) {
			const recordId = recordIds[i];
			if (!recordId) {
				failed++;
				continue;
			}
			const items = await this.apifyService.storedItems<GoogleTrendsCompareItem>(recordId);
			fetched.push({ terms, series: groupSeries(terms, items) });
		}
		const { levels, usableGroups } = anchoredLevels(plan.anchor.key, fetched, plan.months);
		const failedNote = failed ? `, ${failed} runs failed` : '';
		if (!usableGroups)
			return finish(
				'failed',
				`No group came back with ${plan.anchor.key}'s searches${failedNote}`,
			);
		const withData = Object.values(levels).filter(line => line.some(v => v !== null)).length;
		report.searchLevels = {
			anchor: plan.anchor.key,
			geo: plan.geo,
			category: TRENDS_FOOD_CATEGORY,
			months: plan.months,
			pulledAt: new Date().toISOString(),
			groups: plan.groups.length,
			usableGroups,
			levels,
		} satisfies AnchoredSearchLevels;
		return finish(
			'done',
			`${usableGroups} of ${plan.groups.length} groups, ${withData} of ${plan.topics + 1} topics with data${failedNote}`,
		);
	}

	/** A pull that failed before its save (no anchor topic, a city gone): marked so, with why. Flushes. */
	async failPull(cityId: string, quarter: string, message: string): Promise<void> {
		const report = await this.find(cityId, quarter);
		if (!report) return;
		report.searchPull = {
			state: 'failed',
			requestedAt: report.searchPull?.requestedAt ?? new Date().toISOString(),
			finishedAt: new Date().toISOString(),
			note: message,
		};
		await this.em.flush();
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

		const [all, index] = [await this.topicService.all(), await this.topicService.index()];
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
			row.topicKind === TopicKindEnum.FORMAT ?
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
