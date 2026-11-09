import { Controller, NotFoundException, UseGuards } from '@nestjs/common';

import type { WorkflowStatus } from '@dbos-inc/dbos-sdk';
import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	DEFAULT_DURABLE_PRIORITY,
	DURABLE_PRIORITY_ATTRIBUTE,
	isDurablePriority,
} from '../constants/durable-priority.constant.js';
import {
	AdminForkWorkflowInputDto,
	AdminListWorkflowsInputDto,
	AdminSetWorkflowPriorityInputDto,
} from '../dto/admin-workflows.input.dto.js';
import {
	AdminListWorkflowQueuesOutputDto,
	AdminListWorkflowSchedulesOutputDto,
	AdminListWorkflowsOutputDto,
	AdminWorkflowActionOutputDto,
	AdminWorkflowDetailOutputDto,
	AdminWorkflowOutputDto,
	AdminWorkflowPriorityOutputDto,
	AdminWorkflowStepOutputDto,
	DurableWorkflowStatus,
} from '../dto/admin-workflows.output.dto.js';
import { DurableStepInfo, DurableWorkflowsService } from '../services/durable-workflows.service.js';

const json = (value: unknown): string | undefined =>
	value === undefined || value === null ? undefined : JSON.stringify(value);
const date = (epochMs: number | undefined): Date | undefined =>
	epochMs === undefined || epochMs === null ? undefined : new Date(epochMs);
const errorText = (error: unknown): string | undefined =>
	error === undefined || error === null ? undefined
	: error instanceof Error ? error.message
	: typeof error === 'string' ? error
	: JSON.stringify(error);

export const workflowDto = (status: WorkflowStatus): AdminWorkflowOutputDto => {
	const { [DURABLE_PRIORITY_ATTRIBUTE]: level, ...attributes } = status.attributes ?? {};
	return {
		id: status.workflowID,
		status: status.status as DurableWorkflowStatus,
		name: status.workflowName,
		className: status.workflowClassName,
		queue: status.queueName ?? undefined,
		schedule: status.scheduleName ?? undefined,
		parentWorkflowId: status.parentWorkflowID ?? undefined,
		createdAt: new Date(status.createdAt),
		updatedAt: date(status.updatedAt),
		dequeuedAt: date(status.dequeuedAt),
		completedAt: date(status.completedAt),
		delayUntil: date(status.delayUntilEpochMS),
		deduplicationId: status.deduplicationID ?? undefined,
		priority: isDurablePriority(level) ? level : DEFAULT_DURABLE_PRIORITY,
		applicationVersion: status.applicationVersion ?? undefined,
		recoveryAttempts: status.recoveryAttempts ?? undefined,
		attributes:
			Object.keys(attributes).length ?
				Object.fromEntries(
					Object.entries(attributes).map(([k, v]) => [
						k,
						typeof v === 'string' ? v : JSON.stringify(v),
					]),
				)
			:	undefined,
		input: json(status.input),
		output: json(status.output),
		error: errorText(status.error),
	};
};

const stepDto = (step: DurableStepInfo): AdminWorkflowStepOutputDto => ({
	functionId: step.functionID,
	name: step.name,
	childWorkflowId: step.childWorkflowID ?? undefined,
	startedAt: date(step.startedAtEpochMs),
	completedAt: date(step.completedAtEpochMs),
	output: json(step.output),
	error: errorText(step.error),
});

/** What runs, ran and is scheduled: the durable workflows, read from DBOS's own tables. */
@Controller('/admin/workflows')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminWorkflowsController {
	constructor(private readonly durable: DurableWorkflowsService) {}

	/** Newest first; the arguments and result of each run come along (`loadInput`, `loadOutput`) */
	@TypedRoute.Get('/')
	async listWorkflows(
		@TypedQuery() query: AdminListWorkflowsInputDto,
	): Promise<AdminListWorkflowsOutputDto> {
		const [key, ...rest] = query.attribute?.split(':') ?? [];
		const items = await this.durable.list({
			...(query.status && { status: query.status }),
			...(query.name && { workflowName: query.name }),
			...(query.queue && { queueName: this.durable.qualifiedQueueName(query.queue) }),
			...(query.schedule && {
				scheduleName: this.durable.qualifiedScheduleName(query.schedule),
			}),
			...(key && { attributes: { [key]: rest.join(':') } }),
			limit: query.size,
			offset: (query.page - 1) * query.size,
			sortDesc: true,
			loadInput: true,
			loadOutput: true,
		});
		return {
			items: items.map(status => this.toDto(status)),
			page: query.page,
			pageSize: query.size,
			hasMore: items.length === query.size,
		};
	}

	/** Every declared queue with its limits and how many runs wait on or run from it */
	@TypedRoute.Get('/queues')
	async listQueues(): Promise<AdminListWorkflowQueuesOutputDto> {
		const [queues, queued] = await Promise.all([
			this.durable.queues(),
			this.durable.listQueued({ limit: 10_000 }),
		]);
		return {
			items: queues.map(queue => {
				const own = queued.filter(w => w.queueName === queue.name);
				return {
					name: this.durable.declaredQueueName(queue.name),
					workerConcurrency: queue.workerConcurrency,
					globalConcurrency: queue.concurrency,
					rateLimit: queue.rateLimit,
					waiting: own.filter(w => w.status !== 'PENDING').length,
					running: own.filter(w => w.status === 'PENDING').length,
				};
			}),
		};
	}

	/** Every `@DurableSchedule`, as the database has it */
	@TypedRoute.Get('/schedules')
	async listSchedules(): Promise<AdminListWorkflowSchedulesOutputDto> {
		const schedules = await this.durable.schedules();
		return {
			items: schedules.map(s => ({
				name: this.durable.declaredScheduleName(s.scheduleName),
				workflowName: s.workflowName,
				workflowClassName: s.workflowClassName,
				cron: s.schedule,
				// DBOS stores `ACTIVE` / `PAUSED`; the API says it as pause and resume answer
				status: s.status.toLowerCase(),
				timezone: s.cronTimezone ?? undefined,
				queue: s.queueName ?? undefined,
				lastFiredAt: s.lastFiredAt ? new Date(s.lastFiredAt) : undefined,
			})),
		};
	}

	/** Fires the schedule's workflow now; the run is tagged with the schedule like a cron firing */
	@TypedRoute.Post('/schedules/:name/trigger')
	async triggerSchedule(@TypedParam('name') name: string): Promise<AdminWorkflowActionOutputDto> {
		return { workflowId: await this.durable.triggerSchedule(name) };
	}

	@TypedRoute.Post('/schedules/:name/pause')
	async pauseSchedule(
		@TypedParam('name') name: string,
	): Promise<{ name: string; status: string }> {
		await this.durable.pauseSchedule(name);
		return { name, status: 'paused' };
	}

	@TypedRoute.Post('/schedules/:name/resume')
	async resumeSchedule(
		@TypedParam('name') name: string,
	): Promise<{ name: string; status: string }> {
		await this.durable.resumeSchedule(name);
		return { name, status: 'active' };
	}

	/** One run with every step it finished: what each stored, or how it failed */
	@TypedRoute.Get('/:id')
	async getWorkflow(@TypedParam('id') id: string): Promise<AdminWorkflowDetailOutputDto> {
		const status = await this.durable.get(id);
		if (!status) throw new NotFoundException(`No workflow ${id}`);
		const steps = await this.durable.steps(id);
		return { ...this.toDto(status), steps: steps.map(stepDto) };
	}

	/** Stops it at its next step (and its children) and takes it off its queue; `resume` runs it on */
	@TypedRoute.Post('/:id/cancel')
	async cancelWorkflow(@TypedParam('id') id: string): Promise<AdminWorkflowActionOutputDto> {
		await this.durable.cancel(id);
		return this.action(id);
	}

	/** Runs a cancelled, failed or given-up run on from its last finished step */
	@TypedRoute.Post('/:id/resume')
	async resumeWorkflow(@TypedParam('id') id: string): Promise<AdminWorkflowActionOutputDto> {
		await this.durable.resume(id);
		return this.action(id);
	}

	/**
	 * Sets the run's priority, and every live run's under it: `high` takes it and its children off
	 * their queues before everything `normal` waiting, and what it starts from now on is `high` too.
	 * A run already holding a queue's slot keeps it: nothing running is stopped.
	 */
	@TypedRoute.Post('/:id/priority')
	async setWorkflowPriority(
		@TypedParam('id') id: string,
		@TypedBody() body: AdminSetWorkflowPriorityInputDto,
	): Promise<AdminWorkflowPriorityOutputDto> {
		if (!(await this.durable.get(id))) throw new NotFoundException(`No workflow ${id}`);
		const changed = await this.durable.setPriority(id, body.priority);
		return { workflowId: id, priority: body.priority, changed: changed.length };
	}

	/** A new run from `startStep`: the steps before it are copied from this one, the rest run again */
	@TypedRoute.Post('/:id/fork')
	async forkWorkflow(
		@TypedParam('id') id: string,
		@TypedBody() body: AdminForkWorkflowInputDto,
	): Promise<AdminWorkflowActionOutputDto> {
		return this.action(await this.durable.fork(id, body.startStep));
	}

	/** The run as the admin sees it, its queue under the name it was declared with */
	private toDto(status: WorkflowStatus): AdminWorkflowOutputDto {
		return {
			...workflowDto(status),
			queue: status.queueName ? this.durable.declaredQueueName(status.queueName) : undefined,
			schedule:
				status.scheduleName ?
					this.durable.declaredScheduleName(status.scheduleName)
				:	undefined,
		};
	}

	private async action(workflowId: string): Promise<AdminWorkflowActionOutputDto> {
		const status = await this.durable.get(workflowId);
		return { workflowId, status: status?.status as DurableWorkflowStatus | undefined };
	}
}
