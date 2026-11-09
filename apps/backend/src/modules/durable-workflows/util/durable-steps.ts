import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import type { DurableWorkflowsService } from '../services/durable-workflows.service.js';

/**
 * The clock as a step: read once and stored, so every stamp of a run says the same time, on a
 * replay too (a workflow body never reads the clock itself). Takes the facade's `step` only, so a
 * test's fake facade serves it.
 */
export const durableNow = async (
	durable: Pick<DurableWorkflowsService, 'step'>,
	name = 'clock',
): Promise<Date> => new Date(await durable.step(name, async () => new Date().toISOString()));

/** One started child's outcome, as `settleHandles` hands it back */
export type Settled<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * The fan-out's second half: every child started first, then the handles awaited in the order
 * they were started (never `Promise.all`: each child has its own counter, and the parent's replay
 * awaits them one by one), a failed child's error kept beside the others' results, so one failure
 * never loses the rest. The caller decides what a failure means.
 */
export const settleHandles = async <T>(
	handles: Pick<WorkflowHandle<T>, 'getResult'>[],
): Promise<Settled<T>[]> => {
	const out: Settled<T>[] = [];
	for (const handle of handles) {
		try {
			out.push({ ok: true, value: await handle.getResult() });
		} catch (e) {
			out.push({ ok: false, error: (e as Error).message });
		}
	}
	return out;
};

/**
 * A plan's children one after the other, never side by side (an atom whose saves must not
 * overlap: two profile saves at once could give one person two creators, two Instagram saves one
 * user two accounts): each started and awaited in turn. A failed child fails the call only once
 * every other has run, so what the rest fetched is saved; the error names each failed child by
 * its purpose. The caller is the atom's `callEach`.
 */
export const callInOrder = async <C extends { purpose: string }, R>(
	calls: C[],
	call: (c: C) => Promise<R>,
	what: string,
): Promise<R[]> => {
	const results: R[] = [];
	const failed: string[] = [];
	for (const c of calls) {
		try {
			results.push(await call(c));
		} catch (e) {
			failed.push(`${c.purpose}: ${(e as Error).message}`);
		}
	}
	if (failed.length)
		throw new Error(
			`${failed.length} of ${calls.length} ${what} failed (${failed.join('; ')})`,
		);
	return results;
};
