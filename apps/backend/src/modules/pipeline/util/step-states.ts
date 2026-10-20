import { DEFAULT_STEP_BUDGET_USD, MONTHLY_STEPS, PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';

export type StepState = 'succeeded' | 'failed' | 'running' | 'queued' | 'skipped';

/** One step's latest attempt for a city and month, from a run of that step or a monthly run. */
export interface StepAttempt {
	step: PipelineStepEnum;
	state: StepState;
	runId: string;
	at: Date;
	error?: string;
	result?: unknown;
}

export interface RunForStates {
	id: string;
	step: PipelineStepEnum;
	status: PipelineRunStatusEnum;
	result?: Record<string, unknown> | null;
	error?: string | null;
	createdAt: Date;
	startedAt?: Date | null;
	finishedAt?: Date | null;
}

/** A monthly run skips a paid step that already succeeded for the month (`onlyMissing`). */
export const SKIPPED_RESULT = { skipped: 'already ran this month' };

/** Steps that spend on Apify; the others only read and write what is stored (and call the LLM). */
export const isPaidStep = (step: PipelineStepEnum) => DEFAULT_STEP_BUDGET_USD[step] !== undefined;

/**
 * What each step of a run did. A monthly run's finished steps are the keys of its result; the
 * first missing one is where it failed or is running; the ones after it never started.
 */
export function stepAttempts(run: RunForStates): StepAttempt[] {
	const steps = run.step === PipelineStepEnum.MONTHLY ? MONTHLY_STEPS : [run.step];
	const result = run.result ?? {};
	const at = run.finishedAt ?? run.startedAt ?? run.createdAt;
	const out: StepAttempt[] = [];
	let reachedOpen = false;
	for (const [index, step] of steps.entries()) {
		const key = `${index + 1}. ${step}`;
		if (key in result) {
			const value = result[key] as { skipped?: string } | null;
			out.push({
				step,
				state: value && typeof value === 'object' && value.skipped ? 'skipped' : 'succeeded',
				runId: run.id,
				at,
				result: value,
			});
			continue;
		}
		if (reachedOpen) {
			if (run.status === PipelineRunStatusEnum.QUEUED || run.status === PipelineRunStatusEnum.RUNNING) {
				out.push({ step, state: 'queued', runId: run.id, at });
			}
			continue;
		}
		reachedOpen = true;
		switch (run.status) {
			case PipelineRunStatusEnum.FAILED:
				out.push({ step, state: 'failed', runId: run.id, at, ...(run.error && { error: run.error }) });
				break;
			case PipelineRunStatusEnum.RUNNING:
				out.push({ step, state: 'running', runId: run.id, at });
				break;
			case PipelineRunStatusEnum.QUEUED:
				out.push({ step, state: 'queued', runId: run.id, at });
				break;
			// A succeeded run has every key; nothing to add
		}
	}
	return out;
}

/**
 * The latest attempt of each step over a city's runs of one month (any order). A step the
 * monthly sequence runs twice keeps its later attempt; a skip never hides an earlier success.
 */
export function latestStepStates(runs: RunForStates[]): Map<PipelineStepEnum, StepAttempt> {
	const out = new Map<PipelineStepEnum, StepAttempt>();
	const ordered = [...runs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	for (const run of ordered) {
		for (const attempt of stepAttempts(run)) {
			const before = out.get(attempt.step);
			if (attempt.state === 'skipped' && before?.state === 'succeeded') continue;
			out.set(attempt.step, attempt);
		}
	}
	return out;
}
