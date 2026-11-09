<script lang="ts">
	import type { AdminWorkflowQueueOutputDto } from 'client';

	import { onMount } from 'svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every declared queue: its limits and how many runs wait on it or run from it now.
	let queues = $state<AdminWorkflowQueueOutputDto[] | null>(null);
	const loader = createAutoLoader(api.admin.listQueues, [], {
		onSuccess: (res) => (queues = res.items)
	});
	onMount(() => {
		const timer = setInterval(() => loader.load(), 10_000);
		return () => clearInterval(timer);
	});

	const runsOn = (queue: string) => `/admin/workflows?queue=${encodeURIComponent(queue)}`;
	const limit = (n?: number) => (n === undefined || n === null ? 'none' : String(n));
	const rate = (q: AdminWorkflowQueueOutputDto) =>
		q.rateLimit ? `${q.rateLimit.limitPerPeriod} per ${q.rateLimit.periodSec} s` : 'none';
</script>

<AdminPanel title="Queues" note={queues?.length || undefined}>
	{#if loader.error && !queues}
		<ErrorState onRetry={() => loader.load()} />
	{:else if !queues}
		<SkeletonRows count={4} lines={1} trailing />
	{:else if !queues.length}
		<EmptyState title="No queues" hint="A module declares its queues in a queues/*.queue.ts file; they are registered at boot." ground="none" />
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-muted-foreground text-left text-xs">
						<th class="py-1 font-medium">Queue</th>
						<th class="px-2 py-1 text-right font-medium whitespace-nowrap" title="Runs this process takes from it at once">Per worker</th>
						<th class="px-2 py-1 text-right font-medium whitespace-nowrap" title="Runs at once across every process">Overall</th>
						<th class="px-2 py-1 text-right font-medium whitespace-nowrap">Rate limit</th>
						<th class="px-2 py-1 text-right font-medium">Waiting</th>
						<th class="px-2 py-1 text-right font-medium">Running</th>
					</tr>
				</thead>
				<tbody class="divide-line divide-y">
					{#each queues as queue (queue.name)}
						<tr>
							<td class="py-2 pr-2 font-medium">
								<a class="decoration-line hover:decoration-ink underline underline-offset-2" href={runsOn(queue.name)}>{queue.name}</a>
							</td>
							<td class="px-2 py-2 text-right tabular-nums">{limit(queue.workerConcurrency)}</td>
							<td class="px-2 py-2 text-right tabular-nums">{limit(queue.globalConcurrency)}</td>
							<td class="px-2 py-2 text-right tabular-nums whitespace-nowrap">{rate(queue)}</td>
							<td class={cn('px-2 py-2 text-right tabular-nums', queue.waiting ? 'font-semibold' : 'text-muted-foreground')}>{queue.waiting}</td>
							<td class={cn('px-2 py-2 text-right tabular-nums', queue.running ? 'font-semibold' : 'text-muted-foreground')}>{queue.running}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<p class="text-muted-foreground m-0 mt-3 text-sm">
		Waiting counts the runs queued or delayed, running those taken from the queue. A limit of none means the queue takes
		every run at once. The names are the declared ones; DBOS stores them with the application's name in front.
	</p>
</AdminPanel>
