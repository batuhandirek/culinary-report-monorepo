<script lang="ts">
	import type { AnalystPartData } from 'sdk';

	import AskChart from './AskChart.svelte';
	import AskTable from './AskTable.svelte';

	type Query = Extract<AnalystPartData, { type: 'query' }>;

	interface Props {
		data: Query;
	}

	let { data }: Props = $props();
</script>

<!-- A result the analyst showed: its chart (when it named one) over its table -->
<section class="flex flex-col gap-2 rounded-md border border-line bg-paper p-3">
	<header class="flex items-baseline justify-between gap-2">
		<h3 class="m-0 text-sm font-semibold text-ink">{data.title ?? data.purpose}</h3>
		{#if data.rowCount !== undefined}
			<span class="text-xs text-muted-foreground tabular-nums">{data.rowCount}{data.truncated ? '+' : ''} rows</span>
		{/if}
	</header>
	{#if data.columns && data.rows}
		{#if data.chart && data.rows.length > 0}
			<AskChart chart={data.chart} columns={data.columns} rows={data.rows} />
		{/if}
		<AskTable columns={data.columns} rows={data.rows} limit={data.chart ? 8 : 20} />
	{/if}
</section>
