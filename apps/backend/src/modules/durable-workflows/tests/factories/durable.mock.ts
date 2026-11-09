import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

/** One start the fake recorded: what was started, with what, and its outcome */
export interface FakeStart {
	args: unknown[];
	options: Record<string, unknown> | undefined;
	result: Promise<unknown>;
}

/**
 * The facade faked for a PGlite suite (DBOS can't run there): steps run plainly, a started
 * workflow runs inline on the instance that owns the method (`owners`: the workflow classes under
 * test), its handle hands back its outcome, and every start is recorded in `started`, so a suite
 * can await a run a controller only started. `workflowId` is what a body sees as its own run id:
 * the owner an atom tags its actor runs with.
 */
export const fakeDurable = (owners: () => object[], workflowId = 'op-1') => {
	const started: FakeStart[] = [];
	const ownerOf = (fn: unknown) =>
		owners().find(owner =>
			Object.getOwnPropertyNames(Object.getPrototypeOf(owner)).some(
				key => (owner as Record<string, unknown>)[key] === fn,
			),
		);
	return {
		started,
		step: <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn(),
		inWorkflow: () => false,
		isLaunched: () => false,
		isInStep: () => false,
		withinWorkflow: () => false,
		workflowId: () => workflowId,
		stepId: () => undefined,
		start: async <R>(
			fn: (...args: never[]) => Promise<R>,
			args: unknown[],
			options?: Record<string, unknown>,
		): Promise<WorkflowHandle<R>> => {
			const result = (fn as (...args: unknown[]) => Promise<R>).apply(ownerOf(fn), args);
			result.catch(() => undefined);
			started.push({ args, options, result });
			return {
				workflowID: `fake-${started.length}`,
				getResult: () => result,
			} as unknown as WorkflowHandle<R>;
		},
		list: async () => [],
	};
};
