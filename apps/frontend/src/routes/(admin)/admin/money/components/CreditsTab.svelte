<script lang="ts">
	import { AlarmClock, RefreshCw } from '@lucide/svelte';
	import type { AdminApifyCreditOutputDto } from 'client';

	import { ago, at, onDay } from '#components/admin/admin-format.js';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { usd } from '#lib/spend-format.js';
	import { workflowHref } from '#lib/workflow-status.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonCard from '#ui/wrapped/SkeletonCard.svelte';

	// Apify's account as Apify reports it now (read on every load): the cycle's usage limit, what it
	// used, our runs still going (their caps counted as spent until they end) and what is left. An
	// actor run waits while what is left is short of its cap.
	let credit = $state<AdminApifyCreditOutputDto | null>(null);
	const loader = createAutoLoader(api.admin.getApifyCredit, [], {
		onSuccess: (res) => (credit = res as AdminApifyCreditOutputDto)
	});

	// After buying credit or raising the limit: the runs the account covers now go on
	const wake = createAction(() => api.admin.wakeApifyCreditWaiters(), {
		onSuccess: () => loader.load(),
		successNotification: (res) => ({
			title: res.woken ? `${res.woken} of ${res.waiting} woken` : 'None woken',
			text: res.woken
				? 'Each checks the account again and goes on if it fits.'
				: "What is left doesn't cover any waiting run yet."
		})
	});

	const spent = $derived(credit ? credit.usedUsd + credit.runningCapsUsd : 0);
	const share = $derived(credit && credit.limitUsd > 0 ? Math.min(1, spent / credit.limitUsd) : 0);
	const low = $derived(!!credit && credit.remainingUsd < credit.limitUsd * 0.1);

	const facts = $derived<AdminFact[]>(
		credit
			? [
					{ label: 'Usage limit', value: usd(credit.limitUsd), hint: 'this cycle' },
					{ label: 'Used', value: usd(credit.usedUsd), hint: 'as Apify counts it' },
					{
						label: 'Running now',
						value: credit.runningRuns ? usd(credit.runningCapsUsd) : null,
						hint: credit.runningRuns ? `${credit.runningRuns} run${credit.runningRuns === 1 ? '' : 's'}, caps counted until they end` : undefined
					},
					{ label: 'Cycle', value: `${onDay(credit.cycleStart)} – ${onDay(credit.cycleEnd)}` },
					{ label: 'Read', value: at(credit.readAt) }
				]
			: []
	);
</script>

<div class="grid max-w-2xl grid-cols-1 gap-4">
	{#if loader.error && !credit}
		<ErrorState title="Couldn't read the Apify account" onRetry={() => loader.load()} />
	{:else if !credit}
		<SkeletonCard />
	{:else}
		<AdminPanel title="Apify" note={ago(credit.readAt)}>
			{#snippet action()}
				<Button size="sm" variant="outline" icon={RefreshCw} loading={loader.loading} onclick={() => loader.load()}>Read again</Button>
			{/snippet}
			<div class="flex flex-col gap-3">
				<div class="flex flex-col gap-1.5">
					<p class="m-0 flex items-baseline gap-2">
						<span class={cn('text-2xl font-bold tabular-nums', low && 'text-destructive')}>{usd(credit.remainingUsd)}</span>
						<span class="text-muted-foreground text-sm">left of {usd(credit.limitUsd)}</span>
					</p>
					<div class="bg-wash h-2 w-full overflow-hidden rounded-sm" role="img" aria-label={`${Math.round(share * 100)}% used`}>
						<div class={cn('h-full', low ? 'bg-destructive' : 'bg-primary-darker')} style:width={`${share * 100}%`}></div>
					</div>
				</div>
				<AdminFacts items={facts} />
			</div>
		</AdminPanel>
		<AdminPanel title="Waiting for credit" note={credit.waiting.length}>
			{#snippet action()}
				{#if credit?.waiting.length}
					<Button size="sm" variant="outline" icon={AlarmClock} loading={wake.executing} onclick={() => wake.execute()}>Wake them</Button>
				{/if}
			{/snippet}
			{#if credit.waiting.length}
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
					{#each credit.waiting as run (run.workflowId)}
						<li class="flex items-baseline gap-3 py-2">
							<a class="decoration-line hover:decoration-ink min-w-0 flex-1 truncate underline underline-offset-2" href={workflowHref(run.workflowId)} title={run.purpose}>{run.purpose}</a>
							<span class="tabular-nums">needs {usd(run.needUsd)}</span>
							<span class="text-muted-foreground text-xs whitespace-nowrap">since {ago(run.since)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground m-0 text-sm">No actor run is waiting.</p>
			{/if}
		</AdminPanel>
		<p class="text-muted-foreground m-0 text-sm">
			Read live from Apify's API each time. An actor run whose cap what is left doesn't cover waits: every quarter hour the
			credit refresher wakes the ones the account covers, and each wakes by itself when Apify's cycle ends. After buying credit
			or raising the limit, "Wake them" lets them go at once. What each run cost is on the Data page's Apify costs.
		</p>
	{/if}
</div>
