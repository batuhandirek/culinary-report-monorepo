import { Entity, Enum, Index, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { ApifyRunRepository } from '../repositories/apify-run.repository.js';

export enum ApifyRunStatusEnum {
	RUNNING = 'RUNNING',
	SUCCEEDED = 'SUCCEEDED',
	// Stopped by the cost cap, a timeout or an abort: its partial results were kept
	PARTIAL = 'PARTIAL',
	FAILED = 'FAILED',
}

/** One paid actor run: what it was for, what it cost and what came back. */
@Entity({ tableName: 'apify_runs', repository: () => ApifyRunRepository })
export class ApifyRun extends MikroOrmEntityAbstractClass {
	@Property({ type: 'text' })
	actorId: string;

	// What the run was for, e.g. "google-places: Berlin" or "tiktok: venue search"
	@Property({ type: 'text' })
	purpose: string;

	@Index()
	@Enum({ items: () => ApifyRunStatusEnum, nativeEnumName: 'apify_run_status' })
	status: ApifyRunStatusEnum;

	@Property({ type: 'text', nullable: true })
	apifyRunId?: string | null;

	@Property({ type: 'float' })
	maxCostUsd: number;

	@Property({ type: 'float', nullable: true })
	costUsd?: number | null;

	@Property({ type: 'int', nullable: true })
	itemCount?: number | null;

	@Property({ type: 'datetime', nullable: true })
	finishedAt?: Date | null;

	@Property({ type: 'text', nullable: true })
	error?: string | null;

	// sha256 of the actor and its input: a resumed step re-attaches to a run with the same one
	@Property({ type: 'text', nullable: true })
	inputHash?: string | null;

	// The pipeline run and step that started it (`apifyRunContext`); none outside a pipeline run
	@Index()
	@Property({ type: 'uuid', nullable: true })
	pipelineRunId?: string | null;

	@Property({ type: 'text', nullable: true })
	stepKey?: string | null;
}
