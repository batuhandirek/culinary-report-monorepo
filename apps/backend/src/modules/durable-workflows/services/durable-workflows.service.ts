import { Inject, Injectable, Logger } from '@nestjs/common';

import {
	DBOS,
	type GetWorkflowsInput,
	type WorkflowHandle,
	type WorkflowQueue,
	type WorkflowSchedule,
	type WorkflowStatus,
} from '@dbos-inc/dbos-sdk';

import {
	DEFAULT_DURABLE_PRIORITY,
	DURABLE_PRIORITY_ATTRIBUTE,
	DURABLE_PRIORITY_RANK,
	type DurablePriority,
} from '../constants/durable-priority.constant.js';
import {
	DURABLE_WORKFLOWS_LOGGER,
	DURABLE_WORKFLOWS_OPTIONS,
} from '../constants/durable-workflows.constant.js';
import type {
	DurableQueue,
	DurableStepOptions,
	DurableWorkflowsModuleOptions,
	StartOptions,
	WorkflowRef,
} from '../interfaces/durable-workflows.interface.js';

import { DurablePriorityService } from './durable-priority.service.js';
import { DurableQueueMovesService, type QueuedRun } from './durable-queue-moves.service.js';
import { DurableRegistry, workflowKey } from './durable-registry.service.js';
import { DurableRunTreeService } from './durable-run-tree.service.js';

export type DurableStepInfo = NonNullable<
	Awaited<ReturnType<typeof DBOS.listWorkflowSteps>>
>[number];
type StartWorkflowParams = NonNullable<Parameters<typeof DBOS.startWorkflow>[1]>;
type AnyFn = (...args: never[]) => Promise<unknown>;

/** DBOS is not launched here (disabled, or the module not initialised yet), so nothing durable can start */
export class DurableWorkflowsUnavailableError extends Error {
	constructor(what: string) {
		super(
			`Durable workflows are not available (${what}): DBOS is not launched in this process`,
		);
		this.name = 'DurableWorkflowsUnavailableError';
	}
}

/**
 * The one way the app talks to DBOS. Inside a workflow, `step` checkpoints a call and `sleep` /
 * `recv` wait durably; outside one they run plainly, so a service used by workflows and by plain
 * callers (an admin's request, a test) needs no second code path. `start` runs a `@DurableWorkflow`
 * method in the background or on a queue; `enqueue` does the same by name, for a caller that must
 * not import the workflow's class. The rest is management: what runs, its steps, cancel, resume,
 * fork, schedules and queues, for the admin API.
 */
@Injectable()
export class DurableWorkflowsService {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);
	private _launched = false;

	constructor(
		private readonly registry: DurableRegistry,
		private readonly priority: DurablePriorityService,
		private readonly queueMoves: DurableQueueMovesService,
		private readonly runTree: DurableRunTreeService,
		@Inject(DURABLE_WORKFLOWS_OPTIONS) private readonly options: DurableWorkflowsModuleOptions,
	) {}

	/**
	 * The name a declared queue is registered under: the application's name in front, since DBOS
	 * wants queue names unique across the applications sharing a system database (a dev database
	 * cloned from production carries production's queues)
	 */
	qualifiedQueueName(name: string): string {
		return `${this.options.applicationName}.${name}`;
	}

	/** A registered queue's declared name (`defineDurableQueue`), the prefix dropped */
	declaredQueueName(qualified: string): string {
		return this.dropPrefix(qualified);
	}

	/** The name a `@DurableSchedule` is written under: prefixed like a queue, for the same reason */
	qualifiedScheduleName(name: string): string {
		return `${this.options.applicationName}.${name}`;
	}

	/** A written schedule's declared name (`@DurableSchedule(name, …)`), the prefix dropped */
	declaredScheduleName(qualified: string): string {
		return this.dropPrefix(qualified);
	}

	private dropPrefix(qualified: string): string {
		const prefix = `${this.options.applicationName}.`;
		return qualified.startsWith(prefix) ? qualified.slice(prefix.length) : qualified;
	}

	/** Whether DBOS runs in this process (set by the module after `DBOS.launch()`) */
	get launched(): boolean {
		return this._launched;
	}

	markLaunched(): void {
		this._launched = true;
	}

	/** `launched` as a call, for a service that may hold an auto-mock of this facade in a test */
	isLaunched(): boolean {
		return this._launched;
	}

	/** Inside a workflow's own code (not inside one of its steps) */
	inWorkflow(): boolean {
		return this._launched && DBOS.isInWorkflow();
	}

	/** Inside a workflow or one of its steps */
	withinWorkflow(): boolean {
		return this._launched && DBOS.isWithinWorkflow();
	}

	/** Inside a step: no workflow can be started from here, a service does its work inline (the step is its checkpoint) */
	isInStep(): boolean {
		return this._launched && DBOS.isInStep();
	}

	workflowId(): string | undefined {
		return this._launched ? DBOS.workflowID : undefined;
	}

	/** The position of the step the call runs in, inside its workflow; undefined outside a step */
	stepId(): number | undefined {
		return this._launched ? DBOS.stepID : undefined;
	}

	/**
	 * Runs `fn` as a checkpointed step inside a workflow (its result stored, never run again on a
	 * resume), plainly outside one. Steps are where the world is touched: a provider call, a
	 * database write. Keep the result small and serializable (ids and counts, not entities).
	 */
	step<T>(
		name: string,
		fn: () => Promise<T>,
		options: Omit<DurableStepOptions, 'name'> = {},
	): Promise<T> {
		if (!this.inWorkflow()) return fn();
		const { timeoutMs, ...retry } = options;
		return DBOS.runStep(fn, {
			name,
			...retry,
			...(timeoutMs !== undefined && { timeoutMS: timeoutMs }),
		});
	}

	/** Durable inside a workflow (the wake time is stored, a deploy in between changes nothing); a timer outside */
	sleep(ms: number): Promise<void> {
		if (!this.inWorkflow()) return new Promise(resolve => setTimeout(resolve, ms));
		return DBOS.sleep(ms);
	}

	/** Waits for a message `send` addressed to this workflow on `topic`; null when none came in time */
	recv<T>(topic: string, timeoutSeconds: number): Promise<T | null> {
		if (!this.inWorkflow())
			throw new DurableWorkflowsUnavailableError('recv outside a workflow');
		return DBOS.recv<T>(topic, { timeoutSeconds });
	}

	/** Sends a message to a workflow (sleeping in `recv` or not yet there: messages are kept); `idempotencyKey` makes a repeat a no-op */
	send<T>(
		workflowId: string,
		message: T,
		topic?: string,
		idempotencyKey?: string,
	): Promise<void> {
		this.ensureLaunched('send');
		return DBOS.send(workflowId, message, topic, idempotencyKey);
	}

	/** Publishes a value under `key` on the running workflow, for `getEvent` readers (progress) */
	setEvent<T>(key: string, value: T): Promise<void> {
		if (!this.inWorkflow())
			throw new DurableWorkflowsUnavailableError('setEvent outside a workflow');
		return DBOS.setEvent(key, value);
	}

	getEvent<T>(workflowId: string, key: string, timeoutSeconds = 0): Promise<T | null> {
		this.ensureLaunched('getEvent');
		return DBOS.getEvent<T>(workflowId, key, { timeoutSeconds });
	}

	/**
	 * Starts a `@DurableWorkflow` method in the background and hands back its handle; with
	 * `options.queue` it is enqueued instead and runs when the queue lets it. Pass the method as the
	 * service holds it (`this.start(workflows.ingestCity, [cityId], { queue })`).
	 */
	async start<Args extends unknown[], R>(
		fn: (...args: Args) => Promise<R>,
		args: Args,
		options: StartOptions = {},
	): Promise<WorkflowHandle<R>> {
		this.ensureLaunched('start');
		const target = this.registry.invokerOf(fn as unknown as AnyFn) as unknown as (
			...args: Args
		) => Promise<R>;
		return this.started(
			await DBOS.startWorkflow(target, this.startParams(options))(...args),
			options,
		);
	}

	/**
	 * Enqueues a workflow by its registered names (`{ className, name }`), for a caller the workflow
	 * depends on (it cannot inject the workflow's class): `ApifyService` starting its actor-run
	 * child, `IngestionService` a reading run. With `dedupe` and `onDuplicate: 'return-existing'`
	 * a run already waiting or running under the key is handed back instead of a second one, so
	 * two callers asking for the same actor run share it and both get its result.
	 */
	async enqueue<R = unknown>(
		ref: WorkflowRef,
		args: unknown[],
		options: StartOptions & { queue: NonNullable<StartOptions['queue']> },
	): Promise<WorkflowHandle<R>> {
		this.ensureLaunched('enqueue');
		const registered = this.registry.get(ref);
		if (!registered)
			throw new Error(
				`No workflow ${workflowKey(ref)} is registered: is its class a provider with @DurableWorkflow()?`,
			);
		const target = registered.invoker as unknown as (...args: unknown[]) => Promise<R>;
		return this.started(
			await DBOS.startWorkflow(target, this.startParams(options))(...args),
			options,
		);
	}

	/**
	 * The level a start runs at: its own, else the level of the workflow starting it (so an
	 * operation's actor runs, agent calls, atoms and dependencies all pass the queue with it),
	 * else `normal`. Synchronous on purpose: a fan-out's starts keep their order.
	 */
	priorityOf(options: Pick<StartOptions, 'priority'> = {}): DurablePriority {
		return (
			options.priority ??
			(this.inWorkflow() ? this.priority.current() : undefined) ??
			DEFAULT_DURABLE_PRIORITY
		);
	}

	/**
	 * Sets a run, and every live run under it, to `level` (the admin's "run this first"). Its
	 * queued children are taken sooner and its running ones start theirs at the level.
	 */
	async setPriority(workflowId: string, level: DurablePriority): Promise<string[]> {
		this.ensureLaunched('setPriority');
		return this.priority.set(workflowId, level);
	}

	/**
	 * A start at a better level than `normal` that was handed a run already there (the dedupe key's
	 * or the fixed id's, started by someone less urgent) raises that run and what runs under it, or
	 * the urgent caller would wait behind the queue anyway.
	 */
	private async started<R>(
		handle: WorkflowHandle<R>,
		options: StartOptions,
	): Promise<WorkflowHandle<R>> {
		const level = this.priorityOf(options);
		if (DURABLE_PRIORITY_RANK[level] < DURABLE_PRIORITY_RANK[DEFAULT_DURABLE_PRIORITY])
			await this.priority
				.set(handle.workflowID, level, { onlyRaise: true })
				.catch((e: Error) =>
					this.logger.warn(
						`Could not raise ${handle.workflowID} to ${level}: ${e.message}`,
					),
				);
		return handle;
	}

	private startParams(options: StartOptions): StartWorkflowParams {
		if (options.dedupe && !options.queue) throw new Error('`dedupe` needs a `queue`');
		const level = this.priorityOf(options);
		// DBOS takes a priority only for a queued run; the attribute is what a child reads it from
		const priority = options.queue ? DURABLE_PRIORITY_RANK[level] : undefined;
		const enqueue =
			options.dedupe || priority !== undefined || options.delaySeconds !== undefined;
		return {
			...(options.queue && { queueName: this.qualifiedQueueName(options.queue.name) }),
			...(options.workflowId && { workflowID: options.workflowId }),
			...(options.timeoutMs !== undefined && { timeoutMS: options.timeoutMs }),
			workflowAttributes: { ...options.attributes, [DURABLE_PRIORITY_ATTRIBUTE]: level },
			...(options.onDuplicate && { duplicationPolicy: options.onDuplicate }),
			...(enqueue && {
				enqueueOptions: {
					...(options.dedupe && { deduplicationID: options.dedupe }),
					...(priority !== undefined && { priority }),
					...(options.delaySeconds !== undefined && {
						delaySeconds: options.delaySeconds,
					}),
				},
			}),
		};
	}

	// ─── Management (the admin API) ───

	list(filter: GetWorkflowsInput = {}): Promise<WorkflowStatus[]> {
		this.ensureLaunched('list');
		return DBOS.listWorkflows(filter);
	}

	/** The runs waiting on or taken from a queue (ENQUEUED, DELAYED, PENDING) */
	listQueued(filter: GetWorkflowsInput = {}): Promise<WorkflowStatus[]> {
		this.ensureLaunched('listQueued');
		return DBOS.listQueuedWorkflows(filter);
	}

	get(workflowId: string): Promise<WorkflowStatus | null> {
		this.ensureLaunched('get');
		return DBOS.getWorkflowStatus(workflowId);
	}

	async steps(workflowId: string): Promise<DurableStepInfo[]> {
		this.ensureLaunched('steps');
		return (await DBOS.listWorkflowSteps(workflowId)) ?? [];
	}

	/** Takes the run off its queue and stops it at its next step; its children too */
	cancel(workflowId: string): Promise<void> {
		this.ensureLaunched('cancel');
		return DBOS.cancelWorkflow(workflowId, { cancelChildren: true });
	}

	/** Runs a cancelled, failed or stuck run on from its last finished step */
	async resume(workflowId: string): Promise<void> {
		this.ensureLaunched('resume');
		await DBOS.resumeWorkflow(workflowId);
	}

	/** A new run that replays the steps before `startStep` from the old one and runs the rest afresh */
	async fork(workflowId: string, startStep: number): Promise<string> {
		this.ensureLaunched('fork');
		const handle = await DBOS.forkWorkflow(workflowId, startStep);
		return handle.workflowID;
	}

	schedules(): Promise<WorkflowSchedule[]> {
		this.ensureLaunched('schedules');
		return DBOS.listSchedules();
	}

	/** Fires a schedule's workflow now, outside its cron (`name` as declared) */
	async triggerSchedule(name: string): Promise<string> {
		this.ensureLaunched('triggerSchedule');
		return (await DBOS.triggerSchedule(this.qualifiedScheduleName(name))).workflowID;
	}

	pauseSchedule(name: string): Promise<void> {
		this.ensureLaunched('pauseSchedule');
		return DBOS.pauseSchedule(this.qualifiedScheduleName(name));
	}

	resumeSchedule(name: string): Promise<void> {
		this.ensureLaunched('resumeSchedule');
		return DBOS.resumeSchedule(this.qualifiedScheduleName(name));
	}

	queues(): Promise<WorkflowQueue[]> {
		this.ensureLaunched('queues');
		return DBOS.listQueues();
	}

	/**
	 * Moves the live runs of `from` (waiting, delayed or running) to the queue `pick` names for
	 * each; `undefined` or `from` leaves it. For a `@BeforeDurableLaunch` method: DBOS has not
	 * recovered the runs yet, so a run that was running resumes on its new queue, its stored steps
	 * and a sleep's wake-up kept. A run with a dedupe key stays. Returns the moves per declared
	 * queue name.
	 */
	async moveRuns(
		from: DurableQueue,
		pick: (run: QueuedRun) => DurableQueue | undefined,
	): Promise<Record<string, number>> {
		const source = this.qualifiedQueueName(from.name);
		const byTarget = new Map<string, string[]>();
		for (const run of await this.queueMoves.liveRuns(source)) {
			const target = pick(run);
			if (!target || target.name === from.name) continue;
			byTarget.set(target.name, [...(byTarget.get(target.name) ?? []), run.workflowId]);
		}
		const moved: Record<string, number> = {};
		for (const [name, ids] of byTarget) {
			// A few thousand ids a statement at most
			for (let i = 0; i < ids.length; i += 2_000)
				moved[name] =
					(moved[name] ?? 0) +
					(await this.queueMoves.move(
						ids.slice(i, i + 2_000),
						source,
						this.qualifiedQueueName(name),
					));
		}
		return moved;
	}

	/**
	 * From a workflow's body: waits for every run this one started (its children, oldest first),
	 * whatever their end, and says how many failed. A run it was handed back (a dedupe key's or a
	 * fixed id's, started by someone else) is not its child and is not waited for.
	 */
	async awaitChildren(): Promise<{ children: number; failed: number }> {
		const id = this.inWorkflow() ? DBOS.workflowID : undefined;
		if (!id) return { children: 0, failed: 0 };
		// Read straight from the table, not recorded: a replay lists the same children, as only this body starts them
		const childIds = await this.runTree.childIds(id);
		let failed = 0;
		for (const childId of childIds) {
			try {
				await DBOS.retrieveWorkflow(childId).getResult();
			} catch {
				failed++;
			}
		}
		return { children: childIds.length, failed };
	}

	/** Every workflow the scanner registered, by `className/name` */
	registered(): WorkflowRef[] {
		return this.registry.list().map(w => w.ref);
	}

	private ensureLaunched(what: string): void {
		if (!this._launched) throw new DurableWorkflowsUnavailableError(what);
	}
}
