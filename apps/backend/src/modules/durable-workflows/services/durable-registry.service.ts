import { Injectable } from '@nestjs/common';

import type {
	DurableScheduleMetadata,
	WorkflowRef,
} from '../interfaces/durable-workflows.interface.js';

type AnyFn = (...args: never[]) => Promise<unknown>;

export interface RegisteredWorkflow {
	ref: WorkflowRef;
	/** The function DBOS handed back: what `startWorkflow` takes */
	invoker: AnyFn;
	/** What callers hold (the method on the service instance) */
	exposed: AnyFn;
	/** `keepDays` of its decorator: when a finished run of it is deleted (`DurablePruneSchedule`) */
	keepDays?: number;
}

export interface RegisteredSchedule extends DurableScheduleMetadata {
	ref: WorkflowRef;
	invoker: AnyFn;
}

/** A `@BeforeDurableLaunch()` method, bound to its instance */
export interface BeforeLaunchHook {
	/** `ClassName.method`, for the logs */
	name: string;
	run: () => Promise<unknown>;
}

export const workflowKey = (ref: WorkflowRef): string => `${ref.className}/${ref.name}`;

/** What the scanner registered: workflows by name (and by the function callers hold), schedules */
@Injectable()
export class DurableRegistry {
	private readonly workflows = new Map<string, RegisteredWorkflow>();
	private readonly byExposed = new WeakMap<object, RegisteredWorkflow>();
	readonly schedules: RegisteredSchedule[] = [];
	readonly beforeLaunch: BeforeLaunchHook[] = [];

	addWorkflow(registration: RegisteredWorkflow): void {
		this.workflows.set(workflowKey(registration.ref), registration);
		this.byExposed.set(registration.exposed, registration);
	}

	addBeforeLaunch(hook: BeforeLaunchHook): void {
		this.beforeLaunch.push(hook);
	}

	addSchedule(schedule: RegisteredSchedule): void {
		this.schedules.push(schedule);
	}

	has(ref: WorkflowRef): boolean {
		return this.workflows.has(workflowKey(ref));
	}

	get(ref: WorkflowRef): RegisteredWorkflow | undefined {
		return this.workflows.get(workflowKey(ref));
	}

	/** The DBOS function behind a method callers hold, or the function itself when it is one already */
	invokerOf<F extends AnyFn>(fn: F): F {
		return (this.byExposed.get(fn)?.invoker as F | undefined) ?? fn;
	}

	list(): RegisteredWorkflow[] {
		return [...this.workflows.values()];
	}

	/** The workflows whose finished runs are deleted after a while, with how long they are kept */
	prunable(): (WorkflowRef & { keepDays: number })[] {
		return this.list()
			.filter(w => w.keepDays !== undefined)
			.map(w => ({ ...w.ref, keepDays: w.keepDays! }));
	}
}
