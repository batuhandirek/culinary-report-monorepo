<script lang="ts">
	import { ArrowRight, Pause, Play, Zap } from '@lucide/svelte';
	import type { AdminWorkflowScheduleOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import { ago, atExact } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { cronText } from '#lib/cron-text.js';
	import { workflowHref } from '#lib/workflow-status.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every `@DurableSchedule` as the database has it: when it fires, whether it is paused,
	// when it last fired. Trigger fires it now, tagged with the schedule like a cron firing.
	let schedules = $state<AdminWorkflowScheduleOutputDto[] | null>(null);
	const loader = createAutoLoader(api.admin.listSchedules, [], {
		onSuccess: (res) => (schedules = res.items)
	});

	// The run each trigger started here, by schedule
	let started = $state<Record<string, string>>({});
	// The row whose action is in flight, so only its buttons spin
	let busy = $state<string | null>(null);

	const trigger = createAction((name: string) => api.admin.triggerSchedule(name), {
		onSuccess: (res, [name]) => {
			started = { ...started, [name]: res.workflowId };
			loader.load();
		},
		onFinally: () => (busy = null),
		successNotification: (res, [name]) => ({
			title: `${name} started`,
			text: 'Its run is on the Runs tab.',
			action: { label: 'Open the run', onClick: () => goto(workflowHref(res.workflowId)) }
		})
	});

	const pause = createAction((name: string) => api.admin.pauseSchedule(name), {
		onSuccess: () => loader.load(),
		onFinally: () => (busy = null),
		successNotification: (_res, [name]) => ({
			title: `${name} paused`,
			text: 'It will not fire until resumed.',
			action: { label: 'Undo', onClick: () => resume.execute(name) }
		})
	});

	const resume = createAction((name: string) => api.admin.resumeSchedule(name), {
		onSuccess: () => loader.load(),
		onFinally: () => (busy = null),
		successNotification: (_res, [name]) => ({
			title: `${name} resumed`,
			text: 'It fires on its cron again.',
			action: { label: 'Undo', onClick: () => pause.execute(name) }
		})
	});

	const run = (name: string, action: { execute: (name: string) => unknown }) => {
		busy = name;
		action.execute(name);
	};

	const runsOf = (name: string) => `/admin/workflows?schedule=${encodeURIComponent(name)}`;
</script>

<AdminPanel title="Schedules" note={schedules?.length || undefined}>
	{#if loader.error && !schedules}
		<ErrorState onRetry={() => loader.load()} />
	{:else if !schedules}
		<SkeletonRows count={4} lines={2} trailing />
	{:else if !schedules.length}
		<EmptyState
			title="No schedules written"
			hint="Schedules are written at boot only while ingestion is on (INGESTION_IS_DISABLED=false); with it off, the backend deletes them all."
			ground="none" />
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-muted-foreground text-left text-xs">
						<th class="py-1 font-medium">Schedule</th>
						<th class="px-2 py-1 font-medium">When</th>
						<th class="px-2 py-1 font-medium">Status</th>
						<th class="px-2 py-1 font-medium whitespace-nowrap">Last fired</th>
						<th class="py-1 pl-2"><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody class="divide-line divide-y">
					{#each schedules as schedule (schedule.name)}
						{@const paused = schedule.status.toLowerCase() === 'paused'}
						{@const words = cronText(schedule.cron, schedule.timezone)}
						<tr class="align-top">
							<td class="py-2.5 pr-2">
								<a class="decoration-line hover:decoration-ink font-medium underline underline-offset-2" href={runsOf(schedule.name)}>
									{schedule.name}
								</a>
								<span class="text-muted-foreground block text-xs">
									{schedule.workflowClassName}.{schedule.workflowName}{schedule.queue ? ` · on ${schedule.queue}` : ''}
								</span>
							</td>
							<td class="px-2 py-2.5">
								<code class="bg-wash rounded px-1.5 py-0.5 font-mono text-xs">{schedule.cron}</code>
								{#if words}
									<span class="text-muted-foreground block text-xs">{words}</span>
								{:else if schedule.timezone}
									<span class="text-muted-foreground block text-xs">{schedule.timezone}</span>
								{/if}
							</td>
							<td class="px-2 py-2.5">
								<Badge sm variant={paused ? 'secondary' : 'success'}>{paused ? 'Paused' : 'Active'}</Badge>
							</td>
							<td class="text-muted-foreground px-2 py-2.5 whitespace-nowrap" title={atExact(schedule.lastFiredAt)}>
								{schedule.lastFiredAt ? ago(schedule.lastFiredAt) : 'Never'}
								{#if started[schedule.name]}
									<a
										class="text-beet mt-0.5 flex items-center gap-1 text-xs underline-offset-2 hover:underline"
										href={workflowHref(started[schedule.name])}>
										The run you started <ArrowRight class="size-3" />
									</a>
								{/if}
							</td>
							<td class="py-2 pl-2">
								<div class="flex justify-end gap-2">
									<Button
										size="sm"
										variant="outline"
										icon={Zap}
										loading={busy === schedule.name && trigger.executing}
										disabled={busy !== null}
										onclick={() => run(schedule.name, trigger)}>
										Trigger
									</Button>
									{#if paused}
										<Button
											size="sm"
											variant="ghost"
											icon={Play}
											loading={busy === schedule.name && resume.executing}
											disabled={busy !== null}
											onclick={() => run(schedule.name, resume)}>
											Resume
										</Button>
									{:else}
										<Button
											size="sm"
											variant="ghost"
											icon={Pause}
											loading={busy === schedule.name && pause.executing}
											disabled={busy !== null}
											onclick={() => run(schedule.name, pause)}>
											Pause
										</Button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<p class="text-muted-foreground m-0 mt-3 text-sm">
		Trigger fires the schedule's workflow now, as its cron would; Pause keeps it from firing until resumed, across restarts
		too.
	</p>
</AdminPanel>
