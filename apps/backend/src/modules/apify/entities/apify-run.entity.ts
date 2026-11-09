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

	// The durable workflow and the step in it that started the run: a resumed workflow re-attaches
	// to the run its earlier attempt of the step started instead of paying again
	@Index()
	@Property({ type: 'text', nullable: true })
	workflowId?: string | null;

	@Property({ type: 'int', nullable: true })
	workflowStepId?: number | null;

	// The workflow whose work the run is: the operation that asked for it (an atom's caller), else
	// the workflow that called `runActor`. The Data page's spend per month sums by it, since a run
	// started from an atom is a child's child of the operation's run
	@Index()
	@Property({ type: 'text', nullable: true })
	ownerWorkflowId?: string | null;

	// What the run returned, stored once here: the actor-run workflow's result is only the record's
	// id, so DBOS never keeps the items. Lazy and hidden: read only by `ApifyService.storedItems`.
	// Old runs' items can be pruned once their callers have saved them.
	@Property({ type: 'json', nullable: true, lazy: true, hidden: true })
	items?: unknown[] | null;
}
