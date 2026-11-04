<script lang="ts">
	import { ChevronRight, Database, TriangleAlert } from '@lucide/svelte';
	import type { AnalystPartData } from 'sdk';

	import AskTable from './AskTable.svelte';

	import Spinner from '#ui/components/Spinner.svelte';

	type Query = Extract<AnalystPartData, { type: 'query' }>;

	interface Props {
		data: Query;
		running: boolean;
	}

	let { data, running }: Props = $props();
	let open = $state(false);
	const rowsLabel = $derived(
		data.error ? 'failed' : data.rowCount === undefined ? '' : `${data.rowCount}${data.truncated ? '+' : ''} row${data.rowCount === 1 ? '' : 's'}`
	);
</script>

<div class="rounded-sm border border-line bg-paper">
	<button
		type="button"
		class="flex min-h-10 w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm"
		aria-expanded={open}
		onclick={() => (open = !open)}>
		<ChevronRight class={['size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90']} />
		{#if running}
			<Spinner size={14} label="Running" />
		{:else if data.error}
			<TriangleAlert class="size-4 shrink-0 text-chili" />
		{:else}
			<Database class="size-4 shrink-0 text-muted-foreground" />
		{/if}
		<span class="min-w-0 flex-1 truncate text-ink">{data.purpose}</span>
		<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
			{rowsLabel}{#if data.durationMs !== undefined && !data.error} · {(data.durationMs / 1000).toFixed(1)} s{/if}
		</span>
	</button>
	{#if open}
		<div class="flex flex-col gap-2 border-t border-line px-2.5 py-2">
			<pre class="overflow-x-auto rounded-sm bg-wash p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink">{data.sql}</pre>
			{#if data.error}
				<p class="text-xs text-chili">{data.error}</p>
			{:else if data.columns && data.rows}
				<AskTable columns={data.columns} rows={data.rows} limit={10} />
			{/if}
		</div>
	{/if}
</div>
