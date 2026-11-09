import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowStatus } from '@dbos-inc/dbos-sdk';
import _ from 'lodash';

import {
	type DurableStepInfo,
	DurableWorkflowsService,
} from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { MONTH_STEPS, STEP_RUNS_IN } from 'src/modules/pipeline/constants/operations.constant.js';
import {
	DEFAULT_STEP_BUDGET_USD,
	PipelineStepEnum,
} from 'src/modules/pipeline/constants/pipeline.constant.js';
import { monthRange, previousMonth } from 'src/modules/venues/util/month.js';

import type {
	AdminDataCoverageOutputDto,
	AdminDataMonthOutputDto,
	AdminDataQueuedRunOutputDto,
	AdminDataStepOutputDto,
} from '../dto/admin-data-coverage.dto.js';
import { runIdOf, runState, type StepAttempt, stepAttempt } from '../util/workflow-runs.js';

import { monthBefore } from './brand-list.service.js';

// Steps on their own schedule: their latest run, whatever its period
const RECURRING_STEPS = [
	PipelineStepEnum.SCRAPE_TIKTOK_RECENT,
	PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT,
	PipelineStepEnum.SCRAPE_INSTAGRAM_REELS,
	PipelineStepEnum.SCRAPE_BLOGS,
	PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL_RECENT,
	PipelineStepEnum.FIND_OWN_ACCOUNTS,
	PipelineStepEnum.READ_MENTIONED_PROFILES,
	PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS,
	PipelineStepEnum.SAMPLE_BUSYNESS,
	PipelineStepEnum.SAMPLE_RESERVATIONS,
	PipelineStepEnum.SNAPSHOT_RATINGS,
	PipelineStepEnum.TRACK_PROFILES,
	PipelineStepEnum.REFRESH_POST_COUNTS,
	PipelineStepEnum.TRACK_DISH_SEARCHES,
	PipelineStepEnum.WATCH_REVIEWS,
	PipelineStepEnum.SCRAPE_VENUES,
	PipelineStepEnum.SEARCH_BRANCHES,
	PipelineStepEnum.SYNC_OSM_PLACES,
	PipelineStepEnum.LOOKUP_OSM_PLACES,
	PipelineStepEnum.BACKFILL_REVIEWS,
].filter(step => STEP_RUNS_IN[step]);

/** Every workflow a pipeline step runs in */
export const PIPELINE_WORKFLOWS = _.uniq(Object.values(STEP_RUNS_IN).map(where => where!.workflow));

// A recurring step is looked for in its workflow's last few runs: a run may skip it (a quarterly
// city scrape, a step with nothing due)
const RECURRING_RUNS_LOOKED_AT = 3;

/** A step that spends on Apify (it has a default budget) */
const isPaidStep = (step: PipelineStepEnum) => DEFAULT_STEP_BUDGET_USD[step] !== undefined;

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
			workflowId: attempt.workflowId,
			at: attempt.at,
			...(attempt.error && { error: attempt.error }),
			...(summary && { summary }),
		}),
	};
};

/**
 * `/admin/data`: for each month of a city, what its month operations' runs did (read from DBOS:
 * each operation's run of the city and month has one id, `operationRunId`) and what is stored
 * (posts, mentions, reviews, reports), so a half-finished month shows as one. Without DBOS (a
 * test, the eval CLI) the steps carry no state.
 */
@Injectable()
export class DataCoverageService {
	private readonly logger = new Logger(DataCoverageService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly durable: DurableWorkflowsService,
	) {}

	async coverage(
		cityId: string,
		count = 6,
		now = new Date(),
	): Promise<AdminDataCoverageOutputDto> {
		const current = now.toISOString().slice(0, 7);
		const months = [current];
		while (months.length < count) months.push(monthBefore(months[months.length - 1]));
		const oldest = months[months.length - 1];
		const { start } = monthRange(oldest);
		const conn = this.em.getConnection();

		const monthIds = new Map(
			months.map(month => [
				month,
				_.uniq(
					MONTH_STEPS.map(step => runIdOf(STEP_RUNS_IN[step]!.workflow, cityId, month)),
				),
			]),
		);
		const [runs, posts, mentions, reviews, reports] = await Promise.all([
			this.monthRuns([...monthIds.values()].flat()),
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
		]);
		const spend = await this.monthSpend(monthIds, runs);

		const monthDto = (month: string): AdminDataMonthOutputDto => {
			const steps = MONTH_STEPS.map(step => {
				const where = STEP_RUNS_IN[step]!;
				const run = runs.get(runIdOf(where.workflow, cityId, month));
				return stepDto(step, run && stepAttempt(run.status, where.step, run.steps));
			});
			const postRows = posts.filter(p => p.month === month);
			const mentionRows = mentions.filter(m => m.month === month);
			const methodCount = (...methods: (string | null)[]) =>
				_.sumBy(
					mentionRows.filter(m => methods.includes(m.method)),
					m => m.mentions,
				);
			const review = reviews.find(r => r.month === month);
			const report = reports.find(r => r.month === month);
			return {
				month,
				inProgress: month === current,
				complete: steps.every(s => s.state === 'succeeded'),
				posts: {
					tiktok: _.sumBy(
						postRows.filter(p => p.platform === 'tiktok'),
						p => p.posts,
					),
					instagram: _.sumBy(
						postRows.filter(p => p.platform === 'instagram'),
						p => p.posts,
					),
					blog: _.sumBy(
						postRows.filter(p => p.platform === 'blog'),
						p => p.posts,
					),
					unanalysed: _.sumBy(postRows, p => p.unanalysed),
				},
				mentions: {
					matched: methodCount('exact', 'fuzzy', 'llm', 'account', 'manual'),
					unmatched: methodCount('none', null),
					otherCity: methodCount('other_city'),
				},
				reviews: {
					total: review?.reviews ?? 0,
					unanalysed: review?.unanalysed ?? 0,
					venues: review?.venues ?? 0,
				},
				reports: { built: report?.built ?? 0, sent: report?.sent ?? 0 },
				apifyUsd: Math.round((spend.get(month) ?? 0) * 100) / 100,
				steps,
			};
		};

		const recurring = await Promise.all(
			RECURRING_STEPS.map(async step =>
				stepDto(step, await this.latestAttempt(step, cityId)),
			),
		);

		return {
			cityId,
			reportMonth: previousMonth(now),
			months: months.map(monthDto),
			recurring,
			queue: await this.queue(cityId),
		};
	}

	/** The runs among these ids that exist, each with its steps (DBOS records a step once it finished) */
	private async monthRuns(
		ids: string[],
	): Promise<Map<string, { status: WorkflowStatus; steps: DurableStepInfo[] }>> {
		const out = new Map<string, { status: WorkflowStatus; steps: DurableStepInfo[] }>();
		if (!ids.length || !this.durable.isLaunched()) return out;
		try {
			const statuses = await this.durable.list({ workflowIDs: ids, loadOutput: true });
			for (const status of statuses)
				out.set(status.workflowID, {
					status,
					steps: await this.durable.steps(status.workflowID),
				});
		} catch (e) {
			this.logger.warn(
				`Data coverage: the month runs failed to load: ${(e as Error).message}`,
			);
		}
		return out;
	}

	/**
	 * Apify's spend per month: the actor runs one of the month's runs made inline inside a step
	 * (the run's `workflowId`) or asked for (`ownerWorkflowId`: an atom's run, a child's child of
	 * the operation's run, or an actor child started from its body)
	 */
	private async monthSpend(
		monthIds: Map<string, string[]>,
		runs: Map<string, unknown>,
	): Promise<Map<string, number>> {
		const out = new Map<string, number>();
		const monthOf = new Map<string, string>();
		for (const [month, ids] of monthIds)
			for (const id of ids.filter(id => runs.has(id))) monthOf.set(id, month);
		const ids = [...monthOf.keys()];
		if (!ids.length) return out;
		const marks = ids.map(() => '?').join(', ');
		const rows = await this.em
			.getConnection()
			.execute<{ workflow_id: string; usd: string | null }[]>(
				`select coalesce(owner_workflow_id, workflow_id) as workflow_id, sum(cost_usd) as usd
				from apify_runs where workflow_id in (${marks}) or owner_workflow_id in (${marks}) group by 1`,
				[...ids, ...ids],
			);
		for (const row of rows) {
			const month = monthOf.get(row.workflow_id);
			if (month) out.set(month, (out.get(month) ?? 0) + Number(row.usd ?? 0));
		}
		return out;
	}

	/** A recurring step's latest attempt: the newest of its workflow's last runs for the city that ran it */
	private async latestAttempt(
		step: PipelineStepEnum,
		cityId: string,
	): Promise<StepAttempt | undefined> {
		if (!this.durable.isLaunched()) return undefined;
		const where = STEP_RUNS_IN[step]!;
		try {
			const runs = await this.durable.list({
				workflowName: where.workflow,
				attributes: { cityId },
				sortDesc: true,
				limit: where.step ? RECURRING_RUNS_LOOKED_AT : 1,
				loadOutput: !where.step,
			});
			if (!where.step) return runs[0] && stepAttempt(runs[0]);
			let first: StepAttempt | undefined;
			for (const run of runs) {
				const attempt = stepAttempt(
					run,
					where.step,
					await this.durable.steps(run.workflowID),
				);
				if (attempt && attempt.state !== 'running' && attempt.state !== 'queued')
					return attempt;
				first ??= attempt;
			}
			return first;
		} catch (e) {
			this.logger.warn(
				`Data coverage: ${step}'s runs failed to load: ${(e as Error).message}`,
			);
			return undefined;
		}
	}

	/** The city's pipeline runs waiting on their queue or running now, oldest first */
	private async queue(cityId: string): Promise<AdminDataQueuedRunOutputDto[]> {
		if (!this.durable.isLaunched()) return [];
		try {
			const runs = await this.durable.list({
				workflowName: PIPELINE_WORKFLOWS,
				status: ['ENQUEUED', 'PENDING'],
				attributes: { cityId },
			});
			return _.sortBy(runs, r => r.createdAt).map(run => ({
				workflowId: run.workflowID,
				workflow: run.workflowName,
				steps: (Object.entries(STEP_RUNS_IN) as [PipelineStepEnum, { workflow: string }][])
					.filter(([, where]) => where.workflow === run.workflowName)
					.map(([step]) => step),
				...(typeof run.attributes?.period === 'string' && {
					period: run.attributes.period,
				}),
				state:
					runState(run.status) === 'running' ? ('running' as const) : ('queued' as const),
				createdAt: new Date(run.createdAt),
			}));
		} catch (e) {
			this.logger.warn(`Data coverage: the queue failed to load: ${(e as Error).message}`);
			return [];
		}
	}
}
