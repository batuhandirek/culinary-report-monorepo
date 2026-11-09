import { Injectable, Logger } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';

import { DBOS } from '@dbos-inc/dbos-sdk';

import {
	DURABLE_BEFORE_LAUNCH,
	DURABLE_SCHEDULE_OPTIONS,
	DURABLE_STEP_OPTIONS,
	DURABLE_WORKFLOW_OPTIONS,
	DURABLE_WORKFLOWS_LOGGER,
} from '../constants/durable-workflows.constant.js';
import type {
	DurableScheduleMetadata,
	DurableStepOptions,
	DurableWorkflowOptions,
} from '../interfaces/durable-workflows.interface.js';

import { DurablePriorityService } from './durable-priority.service.js';
import { DurableRegistry, workflowKey } from './durable-registry.service.js';
import { DurableWorkflowsService } from './durable-workflows.service.js';

type AnyFn = (...args: never[]) => Promise<unknown>;

/**
 * Finds every `@DurableWorkflow`, `@DurableStep`, `@DurableSchedule` and `@BeforeDurableLaunch` method on the providers
 * Nest built and registers it with DBOS, the way `HandlerScannerService` registers pg-boss
 * handlers. Must run before `DBOS.launch()` (DBOS refuses registrations after it) and after Nest
 * instantiated every provider (true in any `onModuleInit`).
 *
 * A method is registered as a plain function bound to its instance, under the service's class
 * name and the method's: DBOS finds it again by those names when it dequeues or recovers a run.
 * The instance's method is then replaced by a function calling the registered one, so every
 * caller holding the service gets the durable version, and `this` is never the service (DBOS
 * only accepts its own `ConfiguredInstance` there). A workflow's body runs inside
 * `DurablePriorityService.runAs`, so what it starts inherits its priority level.
 */
@Injectable()
export class WorkflowScannerService {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);

	constructor(
		private readonly modulesContainer: ModulesContainer,
		private readonly reflector: Reflector,
		private readonly registry: DurableRegistry,
		private readonly service: DurableWorkflowsService,
		private readonly priority: DurablePriorityService,
	) {}

	scan(): void {
		const seen = new WeakSet<object>();
		for (const module of this.modulesContainer.values()) {
			for (const wrapper of module.providers.values()) {
				const instance = wrapper.instance as object | null | undefined;
				if (!instance || typeof instance !== 'object' || seen.has(instance)) continue;
				seen.add(instance);
				this.scanInstance(instance);
			}
		}
	}

	private scanInstance(instance: object): void {
		const className = instance.constructor.name;
		const prototype = Object.getPrototypeOf(instance) as Record<string, unknown>;
		for (const methodName of Object.getOwnPropertyNames(prototype)) {
			if (methodName === 'constructor') continue;
			const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
			if (typeof descriptor?.value !== 'function') continue;
			const methodRef = descriptor.value as AnyFn;
			const workflow = this.reflector.get<DurableWorkflowOptions | undefined>(
				DURABLE_WORKFLOW_OPTIONS,
				methodRef,
			);
			const schedule = this.reflector.get<DurableScheduleMetadata | undefined>(
				DURABLE_SCHEDULE_OPTIONS,
				methodRef,
			);
			const step = this.reflector.get<DurableStepOptions | undefined>(
				DURABLE_STEP_OPTIONS,
				methodRef,
			);
			if (this.reflector.get<boolean | undefined>(DURABLE_BEFORE_LAUNCH, methodRef))
				this.registry.addBeforeLaunch({
					name: `${className}.${methodName}`,
					run: () => (methodRef as () => Promise<unknown>).call(instance),
				});
			try {
				if (workflow || schedule)
					this.registerWorkflow(
						instance,
						className,
						methodName,
						methodRef,
						workflow ?? {},
						schedule,
					);
				else if (step) this.registerStep(instance, className, methodName, methodRef, step);
			} catch (error) {
				this.logger.error(
					`Could not register ${className}.${methodName}: ${(error as Error).message}`,
				);
				throw error;
			}
		}
	}

	private registerWorkflow(
		instance: object,
		className: string,
		methodName: string,
		methodRef: AnyFn,
		options: DurableWorkflowOptions,
		schedule?: DurableScheduleMetadata,
	): void {
		const ref = { className, name: options.name ?? methodName };
		if (this.registry.has(ref))
			throw new Error(
				`Workflow ${workflowKey(ref)} is registered twice: two providers of the same class, or two methods with one name`,
			);
		const body = methodRef.bind(instance) as AnyFn;
		// The body runs with its run's priority level at hand, which the children it starts inherit
		const bound = ((...args: never[]) =>
			this.priority.runAs(DBOS.workflowID ?? '', () => body(...args))) as AnyFn;
		const invoker = DBOS.registerWorkflow(bound, {
			name: ref.name,
			className,
			...(options.maxRecoveryAttempts !== undefined && {
				maxRecoveryAttempts: options.maxRecoveryAttempts,
			}),
		}) as AnyFn;
		const exposed = ((...args: never[]) => invoker(...args)) as AnyFn;
		Object.defineProperty(instance, methodName, {
			value: exposed,
			writable: true,
			configurable: true,
		});
		this.registry.addWorkflow({ ref, invoker, exposed });
		if (schedule) this.registry.addSchedule({ ...schedule, ref, invoker });
		this.logger.log(
			`Registered workflow ${workflowKey(ref)}${schedule ? ` (schedule ${schedule.name}: ${schedule.cron})` : ''}`,
		);
	}

	private registerStep(
		instance: object,
		className: string,
		methodName: string,
		methodRef: AnyFn,
		options: DurableStepOptions,
	): void {
		const bound = methodRef.bind(instance) as AnyFn;
		const { timeoutMs, name, ...retry } = options;
		const step = DBOS.registerStep(bound, {
			name: name ?? methodName,
			className,
			...retry,
			...(timeoutMs !== undefined && { timeoutMS: timeoutMs }),
		}) as AnyFn;
		Object.defineProperty(instance, methodName, {
			value: ((...args: never[]) => step(...args)) as AnyFn,
			writable: true,
			configurable: true,
		});
	}

	/**
	 * After launch: writes every `@DurableSchedule` to the database (created, or replaced when its
	 * cron or options changed) and removes the schedules of this application no decorator names
	 * any more. With `enabled` off, every schedule of the application is removed instead. Names are
	 * written with the application's in front (`qualifiedScheduleName`): DBOS wants them unique
	 * across the applications sharing a system database.
	 */
	async applySchedules(enabled: boolean): Promise<void> {
		const expected = new Set<string>();
		if (enabled) {
			const schedules = this.registry.schedules;
			if (schedules.length) {
				await DBOS.applySchedules(
					schedules.map(s => ({
						scheduleName: this.service.qualifiedScheduleName(s.name),
						workflowFn: s.invoker as (
							scheduledDate: Date,
							context: unknown,
						) => Promise<void>,
						schedule: s.cron,
						...(s.tz && { cronTimezone: s.tz }),
						...(s.queue && {
							queueName: this.service.qualifiedQueueName(s.queue.name),
						}),
						...(s.backfill !== undefined && { automaticBackfill: s.backfill }),
					})),
				);
			}
			for (const s of schedules) expected.add(this.service.qualifiedScheduleName(s.name));
		}
		for (const existing of await DBOS.listSchedules()) {
			if (expected.has(existing.scheduleName)) continue;
			this.logger.log(
				`Removing ${enabled ? 'orphan ' : ''}schedule ${existing.scheduleName} (${existing.schedule})`,
			);
			await DBOS.deleteSchedule(existing.scheduleName).catch(e =>
				this.logger.warn(
					`Could not remove schedule ${existing.scheduleName}: ${(e as Error).message}`,
				),
			);
		}
	}
}
