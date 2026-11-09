import type { WorkflowStatus } from '@dbos-inc/dbos-sdk';

import type { DurableStepInfo } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { type Cadence, operationRunId } from 'src/modules/pipeline/shared/util/operations.js';

import type { StepState } from '../dto/admin-data-coverage.dto.js';

/** One step's attempt in an operation's run, as the admin's pages show it */
export interface StepAttempt {
	state: StepState;
	workflowId: string;
	at: Date;
	error?: string;
	result?: unknown;
}

/** A run's DBOS status as a step state: a cancelled run, or one a restart gave up on, failed */
export const runState = (status: string): StepState =>
	status === 'SUCCESS' ? 'succeeded'
	: status === 'PENDING' ? 'running'
	: status === 'ENQUEUED' || status === 'DELAYED' ? 'queued'
	: 'failed';

/** An error DBOS stored, as a line */
export const errorText = (error: unknown): string | undefined => {
	if (!error) return undefined;
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && 'message' in error)
		return String((error as { message: unknown }).message);
	return String(error);
};

/** The id of a city's run of a workflow (`scrape-reviews.month`) for a period (`operationRunId`) */
export const runIdOf = (workflow: string, cityId: string, period: string): string => {
	const dot = workflow.lastIndexOf('.');
	return operationRunId(
		{ operation: workflow.slice(0, dot), cadence: workflow.slice(dot + 1) as Cadence },
		cityId,
		period,
	);
};

/**
 * What a run did about one step. Without `step` the run is the step: its status and output. With
 * it, the step's last recorded attempt (DBOS records a step once it finished, with its output or
 * error); a step not recorded is `running` / `queued` while the run is, and never ran when the run
 * ended without it (it failed before, or skipped it).
 */
export const stepAttempt = (
	run: WorkflowStatus,
	step?: string,
	steps: DurableStepInfo[] = [],
): StepAttempt | undefined => {
	const at = new Date(run.updatedAt ?? run.createdAt);
	if (!step)
		return {
			state: runState(run.status),
			workflowId: run.workflowID,
			at,
			...(errorText(run.error) && { error: errorText(run.error) }),
			...(run.output !== undefined && { result: run.output }),
		};
	const done = [...steps].reverse().find(s => s.name === step);
	if (done)
		return done.error ?
				{
					state: 'failed',
					workflowId: run.workflowID,
					at: new Date(done.completedAtEpochMs ?? at),
					...(errorText(done.error) && { error: errorText(done.error) }),
				}
			:	{
					state: 'succeeded',
					workflowId: run.workflowID,
					at: new Date(done.completedAtEpochMs ?? at),
					result: done.output,
				};
	const state = runState(run.status);
	if (state === 'running' || state === 'queued') return { state, workflowId: run.workflowID, at };
	return undefined;
};
