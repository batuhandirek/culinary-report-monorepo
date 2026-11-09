import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';
import { jest } from '@jest/globals';

import type { ActorRunRef, RunActorOptions } from '../../services/apify.service.js';

/** One run the fake answered: its actor, input and options */
export interface FakeActorCall {
	actor: string;
	input: Record<string, unknown>;
	options: RunActorOptions;
}

/**
 * `ApifyService` faked for an atom's or an operation's suite: `runActorRef` (and `startActorRef`, a
 * fan-out's start) answers each run with the items `answer` gives for its input (or throws what it
 * throws), stored under a record id of its own, and `storedItems` reads them back as a save step
 * does. Every run is in `calls`, in the order started.
 */
export class FakeApify<Item> {
	readonly calls: FakeActorCall[] = [];
	/** The items a run gets, by its input (and its actor, for a suite running several actors) */
	answer: (input: Record<string, unknown>, actor: string) => Item[] | Promise<Item[]> = () => [];
	private readonly stored = new Map<string, Item[]>();
	private runs = 0;

	readonly runActorRef = jest.fn(
		async (actor: string, input: object, options: RunActorOptions): Promise<ActorRunRef> => {
			this.calls.push({ actor, input: input as Record<string, unknown>, options });
			const items = await this.answer(input as Record<string, unknown>, actor);
			return { recordId: this.store(items), itemCount: items.length };
		},
	);

	/** A run started for a fan-out: its handle over the same answer */
	readonly startActorRef = jest.fn(
		async (
			actor: string,
			input: object,
			options: RunActorOptions,
		): Promise<WorkflowHandle<ActorRunRef>> => {
			const result = this.runActorRef(actor, input, options);
			result.catch(() => undefined);
			return {
				workflowID: `fake-run-${this.calls.length}`,
				getResult: () => result,
			} as unknown as WorkflowHandle<ActorRunRef>;
		},
	);

	readonly storedItems = jest.fn(
		async <T>(recordId: string): Promise<T[]> =>
			(this.stored.get(recordId) ?? []) as unknown as T[],
	);

	/** Items stored under a record id of their own, as a finished run leaves them */
	store(items: Item[]): string {
		const recordId = `run-${++this.runs}`;
		this.stored.set(recordId, items);
		return recordId;
	}

	reset(): void {
		this.calls.length = 0;
		this.stored.clear();
		this.runs = 0;
		this.answer = () => [];
		this.runActorRef.mockClear();
		this.startActorRef.mockClear();
		this.storedItems.mockClear();
	}
}
