import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import type { ActorRunRef, RunActorOptions } from '../services/apify.service.js';

/**
 * An Apify actor as the app uses it: its id, and the shapes of its input and its items. One
 * `*.actor.ts` per actor in this folder holds those (and the actor's quirks: prices, minimum caps,
 * Free-plan limits); what an item means to our domain (a post, an account) stays with the module
 * that maps it, so this module imports no domain module.
 */
export interface ApifyActor<Input extends object, Item> {
	readonly id: string;
	/** Never set: carries the input and item types to `ActorCall` and `runActorCall` */
	readonly types?: { input: Input; item: Item };
}

export const defineActor = <Input extends object, Item>(id: string): ApifyActor<Input, Item> => ({
	id,
});

/**
 * One actor run as plain data: what a workflow plans (in a step, or from a service's `…Run`
 * method) and starts from its body with `runActorCall`. JSON-safe, so a step may return it.
 */
export interface ActorCall<Input extends object, Item> {
	actor: ApifyActor<Input, Item>;
	input: Input;
	maxCostUsd: number;
	/** The run's purpose on its `ApifyRun` row ("instagram profiles creators: 120") */
	purpose: string;
}

/** What a call may add beside its `ActorCall`: the run's memory, the workflow the run is for */
export type ActorCallOptions = Pick<RunActorOptions, 'memoryMbytes' | 'ownerWorkflowId'>;

/** What runs a typed call: `ApifyService`, or a test's fake of it */
export interface ActorRunner {
	runActor<T>(actorId: string, input: object, options: RunActorOptions): Promise<T[]>;
	runActorRef(actorId: string, input: object, options: RunActorOptions): Promise<ActorRunRef>;
	startActorRef(
		actorId: string,
		input: object,
		options: RunActorOptions,
	): Promise<WorkflowHandle<ActorRunRef>>;
}

/**
 * Runs a typed actor call: `ApifyService.runActor` with the actor's input and item types. From a
 * workflow's body it is a child workflow on the `apify` queue (with the credit wait): call it
 * there, never inside a step. A function over `runActor`, so a test's fake service serves it.
 */
export const runActorCall = <Input extends object, Item>(
	apify: Pick<ActorRunner, 'runActor'>,
	call: ActorCall<Input, Item>,
	options: ActorCallOptions = {},
): Promise<Item[]> =>
	apify.runActor<Item>(call.actor.id, call.input, {
		maxCostUsd: call.maxCostUsd,
		purpose: call.purpose,
		...options,
	});

/**
 * The same call answered with the run's record (`ActorRunRef`) rather than its items: an atom or
 * an operation reads them in its save step (`ApifyService.storedItems`), so its body never carries
 * bulk data. Any typed call fits (the item type is not needed here).
 */
export const runActorCallRef = (
	apify: Pick<ActorRunner, 'runActorRef'>,
	call: ActorCall<object, unknown>,
	options: ActorCallOptions = {},
): Promise<ActorRunRef> =>
	apify.runActorRef(call.actor.id, call.input, {
		maxCostUsd: call.maxCostUsd,
		purpose: call.purpose,
		...options,
	});

/**
 * The same call started, not awaited: the child's handle, for a fan-out from a workflow's body
 * (every run started first, then awaited in order with `settleHandles`); the items read from the
 * run's record in the save step.
 */
export const startActorCall = (
	apify: Pick<ActorRunner, 'startActorRef'>,
	call: ActorCall<object, unknown>,
	options: ActorCallOptions = {},
): Promise<WorkflowHandle<ActorRunRef>> =>
	apify.startActorRef(call.actor.id, call.input, {
		maxCostUsd: call.maxCostUsd,
		purpose: call.purpose,
		...options,
	});
