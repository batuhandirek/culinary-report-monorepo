import type { GetWorkflowsInput, WorkflowStatus } from '@dbos-inc/dbos-sdk';

import type { DurableStepInfo } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

/** A run for the fake: what DBOS would list, with its steps */
export interface FakeRun {
	workflowID: string;
	workflowName: string;
	status: string;
	createdAt: Date | string;
	attributes?: Record<string, unknown>;
	output?: unknown;
	error?: unknown;
	parentWorkflowID?: string;
	steps?: Partial<DurableStepInfo>[];
}

const asList = <T>(value: T | T[] | undefined): T[] | undefined =>
	value === undefined ? undefined
	: Array.isArray(value) ? value
	: [value];

/**
 * `DurableWorkflowsService`'s reads over runs held in memory (DBOS can't run on PGlite): `list`
 * with the filters the overview uses, `steps`, `isLaunched`. `runs` is replaced per test.
 */
export const fakeDurable = () => {
	const state = { runs: [] as FakeRun[] };
	const statusOf = (run: FakeRun): WorkflowStatus =>
		({
			workflowID: run.workflowID,
			workflowName: run.workflowName,
			workflowClassName: 'Fake',
			status: run.status,
			createdAt: new Date(run.createdAt).getTime(),
			updatedAt: new Date(run.createdAt).getTime(),
			priority: 0,
			attributes: run.attributes,
			output: run.output,
			error: run.error,
			parentWorkflowID: run.parentWorkflowID,
		}) as WorkflowStatus;
	return {
		state,
		isLaunched: () => true,
		list: async (filter: GetWorkflowsInput = {}): Promise<WorkflowStatus[]> => {
			const names = asList(filter.workflowName);
			const statuses = asList(filter.status);
			const parents = asList(filter.parentWorkflowID);
			let runs = state.runs.filter(
				run =>
					(!filter.workflowIDs || filter.workflowIDs.includes(run.workflowID)) &&
					(!names || names.includes(run.workflowName)) &&
					(!statuses || (statuses as string[]).includes(run.status)) &&
					(!parents ||
						(run.parentWorkflowID && parents.includes(run.parentWorkflowID))) &&
					(!filter.startTime || new Date(run.createdAt) >= new Date(filter.startTime)) &&
					Object.entries(filter.attributes ?? {}).every(
						([k, v]) => run.attributes?.[k] === v,
					),
			);
			runs = [...runs].sort(
				(a, b) =>
					(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
					(filter.sortDesc ? -1 : 1),
			);
			return runs.slice(0, filter.limit ?? runs.length).map(statusOf);
		},
		steps: async (id: string): Promise<DurableStepInfo[]> =>
			(state.runs.find(r => r.workflowID === id)?.steps ?? []).map(
				(s, i) =>
					({
						functionID: i,
						name: s.name ?? '',
						output: s.output ?? null,
						error: s.error ?? null,
						childWorkflowID: null,
						...s,
					}) as DurableStepInfo,
			),
	};
};
