<script lang="ts">
	import type { AdminApifyRunOutputDto } from 'client';

	import { onMount } from 'svelte';

	import { api } from '#lib/api.js';
	import { enumToName } from '#lib/util.js';
	import type { Column } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// Every paid actor run: what it was for, what came back, what it cost, and why one stopped.
	let refreshKey = $state(0);
	onMount(() => {
		const timer = setInterval(() => refreshKey++, 15_000);
		return () => clearInterval(timer);
	});
	const statusVariant = (status: string) =>
		status === 'SUCCEEDED' ? 'success' : status === 'FAILED' ? 'destructive' : status === 'PARTIAL' ? 'warning' : 'secondary';

	let monthCost = $state<number | null>(null);
	const listApifyRuns = async (query: { page: number; size: number }) => {
		const result = await api.admin.listApifyRuns(query);
		monthCost = result.monthCostUsd;
		return result;
	};
	const APIFY_COLUMNS: Column<AdminApifyRunOutputDto>[] = [
		{ type: 'date', name: 'Started', relative: true, value: (row) => row.createdAt },
		{ type: 'value', name: 'What for', truncate: 46, value: (row) => row.purpose },
		{ type: 'value', name: 'Actor', truncate: 34, value: (row) => row.actorId },
		{ type: 'badge', name: 'Status', value: (row) => enumToName(row.status), variant: (row) => statusVariant(row.status) },
		{ type: 'count', name: 'Items', value: (row) => row.itemCount },
		{
			type: 'value',
			name: 'Cost',
			numeric: true,
			value: (row) => (row.costUsd === undefined ? '' : `$${row.costUsd.toFixed(2)} of $${row.maxCostUsd.toFixed(2)}`)
		},
		// Why a run failed or stopped early, e.g. an actor's Free-plan limit
		{ type: 'value', name: 'Note', truncate: 60, value: (row) => row.error ?? '' }
	];
</script>

<section class="flex min-w-0 flex-col gap-2 pb-12">
	{#if monthCost !== null}
		<p class="text-muted-foreground m-0 text-sm">${monthCost.toFixed(2)} spent this calendar month</p>
	{/if}
	<PaginatedDataTable key={refreshKey} api={listApifyRuns} noun="Apify runs" columns={APIFY_COLUMNS} limit={25} />
</section>
