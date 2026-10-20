import { describe, expect, it } from '@jest/globals';

import { MONTHLY_STEPS, PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { isPaidStep, latestStepStates, type RunForStates, SKIPPED_RESULT, stepAttempts } from '../util/step-states.js';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 18, 10, minutes));
const run = (fields: Partial<RunForStates>): RunForStates => ({
	id: `run-${Math.random()}`,
	step: PipelineStepEnum.SCRAPE_TIKTOK,
	status: PipelineRunStatusEnum.SUCCEEDED,
	result: {},
	createdAt: at(0),
	...fields,
});
const monthlyResult = (upTo: number) =>
	Object.fromEntries(MONTHLY_STEPS.slice(0, upTo).map((s, i) => [`${i + 1}. ${s}`, { ok: true }]));

describe('pipeline step states', () => {
	it('reads a single-step run', () => {
		expect(stepAttempts(run({ result: { '1. SCRAPE_TIKTOK': { saved: 3 } } }))).toMatchObject([
			{ step: PipelineStepEnum.SCRAPE_TIKTOK, state: 'succeeded', result: { saved: 3 } },
		]);
		expect(stepAttempts(run({ status: PipelineRunStatusEnum.FAILED, error: 'cap' }))).toMatchObject([
			{ state: 'failed', error: 'cap' },
		]);
		expect(stepAttempts(run({ status: PipelineRunStatusEnum.QUEUED, result: null }))).toMatchObject([
			{ state: 'queued' },
		]);
	});

	it('reads a failed monthly run: done up to the failure, nothing after it', () => {
		const attempts = stepAttempts(
			run({ step: PipelineStepEnum.MONTHLY, status: PipelineRunStatusEnum.FAILED, error: 'boom', result: monthlyResult(9) }),
		);
		expect(attempts).toHaveLength(10);
		expect(attempts[9]).toMatchObject({ step: MONTHLY_STEPS[9], state: 'failed', error: 'boom' });
	});

	it('marks the steps a running monthly run has ahead as queued', () => {
		const attempts = stepAttempts(
			run({ step: PipelineStepEnum.MONTHLY, status: PipelineRunStatusEnum.RUNNING, result: monthlyResult(2) }),
		);
		expect(attempts[2].state).toBe('running');
		expect(attempts.slice(3).every(a => a.state === 'queued')).toBe(true);
	});

	it('keeps each step’s latest attempt, and a skip never hides an earlier success', () => {
		const states = latestStepStates([
			run({ step: PipelineStepEnum.SCRAPE_REVIEWS, status: PipelineRunStatusEnum.FAILED, createdAt: at(1) }),
			run({ step: PipelineStepEnum.SCRAPE_TIKTOK, result: { '1. SCRAPE_TIKTOK': {} }, createdAt: at(0) }),
			run({
				step: PipelineStepEnum.MONTHLY,
				createdAt: at(5),
				result: { ...monthlyResult(MONTHLY_STEPS.length), '1. SCRAPE_TIKTOK': SKIPPED_RESULT },
			}),
		]);
		expect(states.get(PipelineStepEnum.SCRAPE_TIKTOK)?.state).toBe('succeeded');
		expect(states.get(PipelineStepEnum.SCRAPE_REVIEWS)?.state).toBe('succeeded');
	});

	it('knows the paid steps', () => {
		expect(isPaidStep(PipelineStepEnum.SCRAPE_TIKTOK)).toBe(true);
		expect(isPaidStep(PipelineStepEnum.MATCH_MENTIONS)).toBe(false);
		expect(isPaidStep(PipelineStepEnum.BUILD_REPORTS)).toBe(false);
	});
});
