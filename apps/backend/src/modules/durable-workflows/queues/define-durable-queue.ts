import type {
	DurableQueue,
	DurableQueueOptions,
} from '../interfaces/durable-workflows.interface.js';

const queues = new Map<string, DurableQueue>();

/**
 * Declares a queue in a `queues/*.queue.ts` file: `DurableWorkflowsModule` registers every
 * declared queue with DBOS after launch (its settings are kept in the database and updated on
 * each boot). `workerConcurrency` caps the runs in this process, `globalConcurrency` across
 * processes, `rateLimit` the starts per period (a provider's requests a minute).
 */
export const defineDurableQueue = (
	name: string,
	options: DurableQueueOptions = {},
): DurableQueue => {
	const existing = queues.get(name);
	if (existing) {
		if (JSON.stringify(existing.options) !== JSON.stringify(options))
			throw new Error(`Durable queue "${name}" is defined twice with different settings`);
		return existing;
	}
	const queue: DurableQueue = { name, options };
	queues.set(name, queue);
	return queue;
};

/** Every queue declared so far, in declaration order */
export const definedDurableQueues = (): DurableQueue[] => [...queues.values()];
