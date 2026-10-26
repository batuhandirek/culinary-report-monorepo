import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { MONTHLY_STEPS, PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from 'src/modules/pipeline/entities/pipeline-run.entity.js';
import {
	isPaidStep,
	latestStepStates,
	type StepAttempt,
} from 'src/modules/pipeline/util/step-states.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import type {
	AdminDataCoverageOutputDto,
	AdminDataMonthOutputDto,
	AdminDataStepOutputDto,
} from '../dto/admin-data-coverage.dto.js';

import { monthBefore } from './brand-list.service.js';

// The monthly sequence's steps once each, in order: the grid's rows
const GRID_STEPS = _.uniq(MONTHLY_STEPS);

// Steps on their own schedule: their latest run, whatever its month
const RECURRING_STEPS = [
	PipelineStepEnum.SCRAPE_TIKTOK_RECENT,
	PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT,
	PipelineStepEnum.SCRAPE_INSTAGRAM_REELS,
	PipelineStepEnum.SCRAPE_BLOGS,
	PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT,
	PipelineStepEnum.FIND_OWN_ACCOUNTS,
	PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS,
	PipelineStepEnum.SAMPLE_BUSYNESS,
	PipelineStepEnum.SAMPLE_RESERVATIONS,
	PipelineStepEnum.SNAPSHOT_RATINGS,
	PipelineStepEnum.REFRESH_POST_COUNTS,
	PipelineStepEnum.TRACK_DISH_SEARCHES,
	PipelineStepEnum.WATCH_REVIEWS,
	PipelineStepEnum.SCRAPE_VENUES,
	PipelineStepEnum.SEARCH_BRANCHES,
];

/** A step result's figures in a line: its numbers, nested one level, up to five. */
export const resultSummary = (result: unknown): string | undefined => {
	if (!result || typeof result !== 'object') return undefined;
	const parts: string[] = [];
	const words = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
	for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
		if (typeof value === 'number') parts.push(`${words(key)} ${Math.round(value * 100) / 100}`);
		else if (typeof value === 'string' && key === 'skipped') parts.push(value);
		else if (value && typeof value === 'object' && !Array.isArray(value)) {
			for (const [inner, v] of Object.entries(value as Record<string, unknown>)) {
				if (typeof v === 'number' && v) parts.push(`${words(key)} ${words(inner)} ${v}`);
			}
		}
	}
	return parts.slice(0, 5).join(' · ') || undefined;
};

const stepDto = (step: PipelineStepEnum, attempt?: StepAttempt): AdminDataStepOutputDto => {
	const summary = attempt && resultSummary(attempt.result);
	return {
		step,
		paid: isPaidStep(step),
		...(attempt && {
			state: attempt.state,
			runId: attempt.runId,
			at: attempt.at,
			...(attempt.error && { error: attempt.error }),
			...(summary && { summary }),
		}),
	};
};

/**
 * `/admin/data`: for each month of a city, what the monthly run's steps did and what is stored
 * (posts, mentions, reviews, reports), so a half-finished month shows as one.
 */
@Injectable()
export class DataCoverageService {
	constructor(private readonly em: EntityManager) {}

	async coverage(cityId: string, count = 6, now = new Date()): Promise<AdminDataCoverageOutputDto> {
		const current = now.toISOString().slice(0, 7);
		const months = [current];
		while (months.length < count) months.push(monthBefore(months[months.length - 1]));
		const oldest = months[months.length - 1];
		const { start } = monthRange(oldest);
		const conn = this.em.getConnection();

		const [runs, posts, mentions, reviews, reports, spend] = await Promise.all([
			this.em.find(PipelineRun, { city: cityId }, { orderBy: { createdAt: 'asc' } }),
			conn.execute<{ month: string; platform: string; posts: number; unanalysed: number }[]>(
				`select to_char(posted_at at time zone 'UTC', 'YYYY-MM') as month, platform, count(*)::int as posts,
					(count(*) filter (where analysed_at is null))::int as unanalysed
				from social_posts where city_id = ? and posted_at >= ? group by 1, 2`,
				[cityId, start],
			),
			conn.execute<{ month: string; method: string | null; mentions: number }[]>(
				`select to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') as month, m.match_method as method, count(*)::int as mentions
				from mentions m join social_posts p on p.id = m.post_id
				where p.city_id = ? and p.posted_at >= ? group by 1, 2`,
				[cityId, start],
			),
			conn.execute<{ month: string; reviews: number; unanalysed: number; venues: number }[]>(
				`select to_char(r.published_at at time zone 'UTC', 'YYYY-MM') as month, count(*)::int as reviews,
					(count(*) filter (where r.analysed_at is null and coalesce(r.text, r.text_translated) is not null))::int as unanalysed,
					count(distinct r.venue_id)::int as venues
				from reviews r join venues v on v.id = r.venue_id
				where v.city_id = ? and r.published_at >= ? group by 1`,
				[cityId, start],
			),
			conn.execute<{ month: string; built: number; sent: number }[]>(
				`select month, count(*)::int as built, count(sent_at)::int as sent
				from reports where (city_id = ? or city_id is null) and month >= ? group by 1`,
				[cityId, oldest],
			),
			conn.execute<{ month: string; usd: string | null }[]>(
				`select pr.month, sum(a.cost_usd) as usd
				from apify_runs a join pipeline_runs pr on pr.id = a.pipeline_run_id
				where pr.city_id = ? group by 1`,
				[cityId],
			),
		]);

		const byMonth = _.groupBy(runs, r => r.month);
		const monthDto = (month: string): AdminDataMonthOutputDto => {
			const states = latestStepStates(byMonth[month] ?? []);
			const steps = GRID_STEPS.map(step => stepDto(step, states.get(step)));
			const postRows = posts.filter(p => p.month === month);
			const mentionRows = mentions.filter(m => m.month === month);
			const methodCount = (...methods: (string | null)[]) =>
				_.sumBy(mentionRows.filter(m => methods.includes(m.method)), m => m.mentions);
			const review = reviews.find(r => r.month === month);
			const report = reports.find(r => r.month === month);
			return {
				month,
				inProgress: month === current,
				complete: steps.every(s => s.state === 'succeeded' || s.state === 'skipped'),
				posts: {
					tiktok: _.sumBy(postRows.filter(p => p.platform === 'tiktok'), p => p.posts),
					instagram: _.sumBy(postRows.filter(p => p.platform === 'instagram'), p => p.posts),
					blog: _.sumBy(postRows.filter(p => p.platform === 'blog'), p => p.posts),
					unanalysed: _.sumBy(postRows, p => p.unanalysed),
				},
				mentions: {
					matched: methodCount('exact', 'fuzzy', 'llm', 'manual'),
					unmatched: methodCount('none', null),
					otherCity: methodCount('other_city'),
				},
				reviews: {
					total: review?.reviews ?? 0,
					unanalysed: review?.unanalysed ?? 0,
					venues: review?.venues ?? 0,
				},
				reports: { built: report?.built ?? 0, sent: report?.sent ?? 0 },
				apifyUsd: Math.round(Number(spend.find(s => s.month === month)?.usd ?? 0) * 100) / 100,
				steps,
			};
		};

		const latestRecurring = (step: PipelineStepEnum) => {
			const last = _.findLast(runs, r => r.step === step);
			return stepDto(step, last && latestStepStates([last]).get(step));
		};

		return {
			cityId,
			reportMonth: previousMonth(now),
			months: months.map(monthDto),
			recurring: RECURRING_STEPS.map(latestRecurring),
			queue: runs
				.filter(r => r.status === PipelineRunStatusEnum.QUEUED || r.status === PipelineRunStatusEnum.RUNNING)
				.map(r => ({
					runId: r.id,
					step: r.step,
					month: r.month,
					state: r.status === PipelineRunStatusEnum.RUNNING ? ('running' as const) : ('queued' as const),
					createdAt: r.createdAt,
				})),
		};
	}
}
