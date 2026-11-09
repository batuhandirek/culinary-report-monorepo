<script lang="ts">
	import { ChevronsUp, CircleStop, GitFork, Play } from '@lucide/svelte';

	import { onMount } from 'svelte';

	import {
		AdminSetWorkflowPriorityInputDtoPriorityEnum as Priority,
		type AdminWorkflowDetailOutputDto,
		type AdminWorkflowStepOutputDto
	} from 'client';

	import ForkDialog from './components/ForkDialog.svelte';
	import RunTree from './components/RunTree.svelte';
	import StepList from './components/StepList.svelte';

	import { goto, invalidateAll } from '$app/navigation';
	import { at, workflowStatusVariant } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import { api } from '#lib/api.js';
	import {
		canCancelWorkflow,
		canResumeWorkflow,
		formatDuration,
		isWorkflowLive,
		isWorkflowWaiting,
		workflowDuration,
		workflowHref,
		workflowStatusLabel
	} from '#lib/workflow-status.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// One durable run: how it stands, what it was given and gave back, and every step it
	// finished with what that step stored. A live run is read again every few seconds.
	let { data } = $props();
	let run: AdminWorkflowDetailOutputDto = $derived(data.workflow);
	adminCitiesStore.load();

	const live = $derived(isWorkflowLive(run.status));
	onMount(() => {
		const timer = setInterval(() => {
			if (live) invalidateAll();
		}, 4000);
		return () => clearInterval(timer);
	});

	const parse = (json: string): unknown => {
		try {
			return JSON.parse(json);
		} catch {
			return json;
		}
	};
	const duration = $derived(workflowDuration(run));
	const cityName = (id: string) => adminCitiesStore.list.find((c) => c.id === id)?.name ?? id;

	const facts = $derived<AdminFact[]>([
		{ label: 'Class', value: run.className, mono: true },
		{ label: 'Queue', value: run.queue, href: run.queue ? `/admin/workflows?queue=${encodeURIComponent(run.queue)}` : undefined },
		{
			label: 'Schedule',
			value: run.schedule,
			href: run.schedule ? `/admin/workflows?schedule=${encodeURIComponent(run.schedule)}` : undefined
		},
		{ label: 'Parent run', value: run.parentWorkflowId?.slice(0, 8), href: run.parentWorkflowId ? workflowHref(run.parentWorkflowId) : undefined, mono: true },
		{ label: 'Created', value: at(run.createdAt) },
		{ label: 'Left the queue', value: run.dequeuedAt ? at(run.dequeuedAt) : null },
		{ label: 'Completed', value: run.completedAt ? at(run.completedAt) : null },
		isWorkflowWaiting(run.status)
			? { label: 'Waiting for', value: formatDuration(Date.now() - new Date(run.createdAt).getTime()) }
			: { label: live ? 'Running for' : 'Took', value: duration === undefined ? null : formatDuration(duration) },
		...(run.delayUntil ? [{ label: 'Delayed until', value: at(run.delayUntil) }] : []),
		...(run.deduplicationId ? [{ label: 'Dedupe key', value: run.deduplicationId, mono: true }] : []),
		{
			label: 'Priority',
			value: run.priority,
			hint: run.priority === 'high' ? 'taken off its queue before the normal runs, and so is all it starts' : undefined
		},
		// DBOS counts the first start as an attempt too
		...((run.recoveryAttempts ?? 0) > 1
			? [{ label: 'Recovered', value: `${run.recoveryAttempts! - 1}×`, hint: 'picked up again after a restart' }]
			: []),
		{ label: 'Version', value: run.applicationVersion, mono: true },
		{ label: 'Id', value: run.id, mono: true },
		...Object.entries(run.attributes ?? {}).map(([key, value]) =>
			key === 'cityId'
				? { label: 'City', value: cityName(value), href: `/admin/cities/${value}` }
				: { label: key, value }
		)
	]);

	const refresh = () => invalidateAll();

	const cancel = createAction(() => api.admin.cancelWorkflow(run.id), {
		onSuccess: refresh,
		successNotification: {
			title: 'Cancelled',
			text: 'It stops at its next step, with its children, and leaves its queue. Resume runs it on.'
		}
	});
	const resume = createAction(() => api.admin.resumeWorkflow(run.id), {
		onSuccess: refresh,
		successNotification: { title: 'Resumed', text: 'It runs on from its last finished step.' }
	});

	// Ahead of every normal run waiting, it and every live run under it; what it starts from now on too
	const runFirst = createAction(() => api.admin.setWorkflowPriority(run.id, { priority: Priority.High }), {
		onSuccess: refresh,
		successNotification: (res) => ({
			title: 'Runs first',
			text: `${res.changed} live run${res.changed === 1 ? '' : 's'} set to high: taken off their queues before the normal ones.`
		})
	});

	let forkOpen = $state(false);
	let forkFrom = $state(0);
	const openFork = (step?: AdminWorkflowStepOutputDto) => {
		forkFrom = step?.functionId ?? 0;
		forkOpen = true;
	};
	const fork = createAction((startStep: number) => api.admin.forkWorkflow(run.id, { startStep }), {
		onSuccess: (res) => {
			forkOpen = false;
			goto(workflowHref(res.workflowId));
		},
		successNotification: (_res, [startStep]) => ({ title: 'Forked', text: `A new run, afresh from step ${startStep}.` })
	});
</script>

<AdminPageHeader title={run.name}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">Workflow run · {at(run.createdAt)}</span>
	{/snippet}
	<Badge pill variant={workflowStatusVariant(run.status)}>{workflowStatusLabel(run.status)}</Badge>
	{#snippet rightTitle()}
		{#if canCancelWorkflow(run.status)}
			<Button size="sm" variant="outline" icon={CircleStop} loading={cancel.executing} onclick={() => cancel.execute()}>Cancel</Button>
		{/if}
		{#if live && run.priority !== 'high'}
			<Button size="sm" variant="outline" icon={ChevronsUp} loading={runFirst.executing} onclick={() => runFirst.execute()}>Run first</Button>
		{/if}
		{#if canResumeWorkflow(run.status)}
			<Button size="sm" variant="outline" icon={Play} loading={resume.executing} onclick={() => resume.execute()}>Resume</Button>
		{/if}
		<Button size="sm" variant="outline" icon={GitFork} onclick={() => openFork()}>Fork…</Button>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	{#if run.error}
		<AdminPanel title={workflowStatusLabel(run.status)}>
			<pre
				class="bg-destructive/10 text-destructive m-0 max-h-80 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">{run.error}</pre>
		</AdminPanel>
	{/if}

	<AdminPanel title="Run">
		<AdminFacts items={facts} />
	</AdminPanel>

	<AdminPanel title="What it started">
		<RunTree runId={run.id} />
	</AdminPanel>

	<div class="grid grid-cols-1 gap-3">
		{#if run.input !== undefined}
			<AdminRawJson value={parse(run.input)} label="Input: the arguments it was started with" />
		{/if}
		{#if run.output !== undefined}
			<AdminRawJson value={parse(run.output)} label="Output: its result" />
		{/if}
	</div>

	<AdminPanel title="Steps" note={run.steps.length}>
		{#if run.steps.length}
			<StepList steps={run.steps} onFork={openFork} />
		{:else}
			<EmptyState
				title={live ? 'No step finished yet' : 'No steps'}
				hint={live ? 'Each step shows up here as it finishes.' : 'This run ran no checkpointed step.'}
				ground="none"
				size="sm" />
		{/if}
	</AdminPanel>
</div>

<ForkDialog
	bind:open={forkOpen}
	steps={run.steps}
	startStep={forkFrom}
	forking={fork.executing}
	onFork={(startStep) => fork.execute(startStep)} />
