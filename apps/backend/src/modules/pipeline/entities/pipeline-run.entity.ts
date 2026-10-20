import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';

export enum PipelineRunStatusEnum {
	QUEUED = 'QUEUED',
	RUNNING = 'RUNNING',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
}

export interface PipelineRunParams {
	budgetUsd?: number;
	top?: number;
	// SCRAPE_REVIEWS: the first day to scrape (YYYY-MM-DD) when earlier than the month's
	since?: string;
	// MONTHLY: skip the paid steps that already succeeded for the city and month ("finish the month")
	onlyMissing?: boolean;
}

/** One run of a pipeline step, started by the monthly cron or an admin. */
@Entity({ tableName: 'pipeline_runs' })
export class PipelineRun extends MikroOrmEntityAbstractClass<'resumes'> {
	@Enum({ items: () => PipelineStepEnum, nativeEnumName: 'pipeline_step' })
	step: PipelineStepEnum;

	// The city the run works on: its sources, venues and budgets
	@ManyToOne({ entity: () => City, index: true })
	city: Rel<City>;

	// YYYY-MM the step works on
	@Property({ type: 'text' })
	month: string;

	@Index()
	@Enum({ items: () => PipelineRunStatusEnum, nativeEnumName: 'pipeline_run_status' })
	status: PipelineRunStatusEnum;

	@Property({ type: 'jsonb', nullable: true })
	params?: PipelineRunParams | null;

	// What each step did, e.g. `{ "SCRAPE_TIKTOK": { "saved": 320 } }`
	@Property({ type: 'jsonb', nullable: true })
	result?: Record<string, unknown> | null;

	@Property({ type: 'text', nullable: true })
	error?: string | null;

	@Property({ type: 'datetime', nullable: true })
	startedAt?: Date | null;

	@Property({ type: 'datetime', nullable: true })
	finishedAt?: Date | null;

	// How often a backend restart cut it short and it was queued again to go on where it stopped
	@Property({ type: 'int', default: 0 })
	resumes: number = 0;
}
