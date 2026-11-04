<script lang="ts">
	import { formatNumber } from './AskChart.svelte';

	type Cell = string | number | boolean | null;

	interface Props {
		columns: string[];
		rows: Cell[][];
		/** Rows shown before "Show all" */
		limit?: number;
	}

	let { columns, rows, limit = 20 }: Props = $props();
	let all = $state(false);
	const shown = $derived(all ? rows : rows.slice(0, limit));
	const numeric = $derived(columns.map((_, i) => rows.length > 0 && rows.every((r) => r[i] === null || typeof r[i] === 'number')));
	const cell = (value: Cell) => (value === null ? '—' : typeof value === 'number' ? formatNumber(value) : String(value));
</script>

<div class="max-h-96 overflow-auto rounded-sm border border-line">
	<table class="w-full border-collapse text-xs">
		<thead class="sticky top-0 bg-wash">
			<tr>
				{#each columns as column, i (i)}
					<th class={['px-2 py-1.5 font-semibold whitespace-nowrap text-ink', numeric[i] ? 'text-right' : 'text-left']}>{column}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each shown as row, r (r)}
				<tr class="border-t border-line">
					{#each row as value, i (i)}
						<td class={['max-w-80 px-2 py-1 align-top', numeric[i] ? 'text-right tabular-nums' : 'text-left']}>
							<span class="line-clamp-3 break-words">{cell(value)}</span>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
{#if rows.length > limit}
	<button type="button" class="mt-1 text-xs font-medium text-grape hover:underline" onclick={() => (all = !all)}>
		{all ? 'Show fewer' : `Show all ${rows.length} rows`}
	</button>
{/if}
