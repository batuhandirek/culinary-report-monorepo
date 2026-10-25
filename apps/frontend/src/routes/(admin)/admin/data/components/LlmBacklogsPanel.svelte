<script lang="ts">
	import { Play } from '@lucide/svelte';
	import type { AdminLlmBacklogOutputDto, AdminLlmBacklogsOutputDto } from 'client';

	import { ago, onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import type { BadgeVariant } from '#ui/primitives-new/badge/index.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// LLM backfills over stored data, drained a little each night within the free allowance
	// (`LlmBacklogService`): what is left of each, the last seven days, and why its last run stopped
	interface Props {
		/** Bumped by the tab to reload with its runs table */
		refreshKey?: number;
	}

	let { refreshKey = 0 }: Props = $props();

	let status = $state<AdminLlmBacklogsOutputDto | null>(null);
	const loader = createAutoLoader(api.admin.listLlmBacklogs, [], {
		onSuccess: (res) => (status = res)
	});
	$effect(() => {
		if (refreshKey) loader.load();
	});

	const runAction = createAction(() => api.admin.runLlmBacklogs(), {
		onSuccess: () => loader.load(),
		successNotification: () => ({ title: 'Queued', text: 'The backlogs run now, within what is left of today’s budget' })
	});

	const STOPS: Record<string, { label: string; variant: BadgeVariant }> = {
		empty: { label: 'Done', variant: 'success' },
		budget: { label: 'Day’s budget spent', variant: 'secondary' },
		allowance: { label: 'Allowance used up', variant: 'warning' },
		error: { label: 'Error', variant: 'destructive' },
		shutdown: { label: 'Restarted', variant: 'secondary' }
	};
	const stopOf = (row: AdminLlmBacklogOutputDto) => (row.lastRun?.stopReason ? STOPS[row.lastRun.stopReason] : undefined);
	const count = (n?: number) => (n === undefined ? '—' : n.toLocaleString('en'));
	const millions = (n: number) => `${(n / 1_000_000).toLocaleString('en', { maximumFractionDigits: 2 })}M`;
</script>

<AdminPanel title="LLM backlogs" note={status?.items.length || undefined}>
	{#snippet action()}
		<Button variant="outline" size="sm" icon={Play} loading={runAction.executing} onclick={() => runAction.execute()}>Run now</Button>
	{/snippet}
	{#if loader.error && !status}
		<ErrorState onRetry={() => loader.load()} />
	{:else if !status}
		<SkeletonRows count={2} lines={1} trailing />
	{:else if !status.items.length}
		<EmptyState title="No backlogs" hint="A service registers its backfill as a backlog when it has one." ground="none" />
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-muted-foreground text-left text-xs">
						<th class="py-1 font-medium">Backlog</th>
						<th class="px-2 py-1 text-right font-medium">Left</th>
						<th class="px-2 py-1 text-right font-medium whitespace-nowrap">Done, 7 days</th>
						<th class="px-2 py-1 font-medium">Last run</th>
						<th class="px-2 py-1 font-medium whitespace-nowrap">Last moved</th>
					</tr>
				</thead>
				<tbody class="divide-line divide-y">
					{#each status.items as row (row.key)}
						{@const stop = stopOf(row)}
						<tr>
							<td class="py-2 pr-2 font-medium">{row.label}</td>
							<td class="px-2 py-2 text-right tabular-nums">{count(row.remaining)}</td>
							<td class="px-2 py-2 text-right tabular-nums">{count(row.doneLast7Days)}</td>
							<td class="px-2 py-2">
								{#if row.lastRun}
									<span class="text-muted-foreground mr-1 text-xs">{onDay(row.lastRun.day)}</span>
									{#if stop}<Badge sm variant={stop.variant}>{stop.label}</Badge>{/if}
									{#if row.lastRun.error}
										<span class="text-muted-foreground block max-w-80 truncate text-xs" title={row.lastRun.error}>{row.lastRun.error}</span>
									{/if}
								{:else}
									<span class="text-muted-foreground">Not run yet</span>
								{/if}
							</td>
							<td class="text-muted-foreground px-2 py-2 whitespace-nowrap">{row.lastMovedAt ? ago(row.lastMovedAt) : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<p class="text-muted-foreground m-0 mt-3 text-sm">
		Backfills that need the LLM run every night at 22:00 UTC, in this order, on the free allowance only
		{#if status}(today {millions(status.spentToday)} of {millions(status.dailyTokens)} tokens){/if}. A run stops when a backlog is
		done, the day's budget is spent or the allowance runs out, and goes on the next night. Run now goes on within today's budget.
	</p>
</AdminPanel>
