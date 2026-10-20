<script lang="ts" module>
	export interface TopicRow {
		label: string;
		/** One value per month; null where the month has no data */
		values: (number | null)[];
	}
</script>

<script lang="ts">
	import { shortMonth } from '#components/charts/month-chart.js';
	import { monthLabel } from '#lib/culinary.js';
	import { cn } from '#ui/lib/utils.js';

	/**
	 * A few topics or dishes over the months, one row each: the name, a small line on a shared
	 * scale (so rows compare), and the value in the active month. Small multiples instead of
	 * one tangle of lines; one hue per panel — olive for praise and dishes, beet for complaints.
	 */
	interface Props {
		title: string;
		note?: string;
		months: string[];
		rows: TopicRow[];
		format: (value: number) => string;
		tone?: 'good' | 'bad';
		selected: number;
		empty: string;
	}

	let { title, note, months, rows, format, tone = 'good', selected, empty }: Props = $props();

	const W = 120;
	const H = 28;
	const PAD = 4;
	const max = $derived(
		Math.max(0, ...rows.flatMap((row) => row.values.filter((v): v is number => v !== null)))
	);
	const x = (i: number) => PAD + (i / Math.max(1, months.length - 1)) * (W - PAD * 2);
	const y = (v: number) => H - PAD - (max ? v / max : 0) * (H - PAD * 2);
	const path = (values: (number | null)[]) => {
		let d = '';
		let pen = false;
		values.forEach((v, i) => {
			if (v === null) pen = false;
			else {
				d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
				pen = true;
			}
		});
		return d;
	};
	const stroke = $derived(tone === 'good' ? 'stroke-primary-darker' : 'stroke-beet');
	const fill = $derived(tone === 'good' ? 'fill-primary-darker' : 'fill-beet');
</script>

<section class="bg-paper border-line flex min-w-0 flex-col gap-3 rounded-md border px-4 pt-4 pb-3">
	<header class="flex flex-wrap items-baseline justify-between gap-x-3">
		<h3 class="text-ink m-0 text-base font-semibold">{title}</h3>
		<span class="text-muted-foreground text-xs">{monthLabel(months[selected])}</span>
		{#if note}<p class="text-muted-foreground m-0 w-full text-xs">{note}</p>{/if}
	</header>

	{#if rows.length}
		<ul class="m-0 flex list-none flex-col p-0">
			{#each rows as row, r (row.label)}
				{@const value = row.values[selected]}
				<li class={cn('flex items-center gap-3 py-2', r > 0 && 'border-line border-t')}>
					<span class="text-ink min-w-0 flex-1 truncate text-sm">{row.label}</span>
					<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} class="shrink-0" aria-hidden="true">
						<line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} class="stroke-line" />
						<path
							d={path(row.values)}
							fill="none"
							class={stroke}
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round" />
						{#if value !== null && value !== undefined}
							<circle cx={x(selected)} cy={y(value)} r="3.5" class={cn(fill, 'stroke-paper')} stroke-width="2" />
						{/if}
					</svg>
					<span class="text-ink w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
						{value === null || value === undefined ? '—' : format(value)}
					</span>
				</li>
			{/each}
		</ul>
		<details class="text-xs">
			<summary class="text-beet cursor-pointer py-1 select-none">Table</summary>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left tabular-nums">
					<thead>
						<tr class="text-muted-foreground">
							<th class="py-1 pr-3 font-medium">Month</th>
							{#each rows as row (row.label)}<th class="py-1 pr-3 font-medium">{row.label}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each months as month, i (month)}
							<tr class="border-line border-t">
								<td class="py-1 pr-3">{shortMonth(month, true)}</td>
								{#each rows as row (row.label)}
									<td class="py-1 pr-3">{row.values[i] === null ? '—' : format(row.values[i]!)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	{:else}
		<p class="text-muted-foreground m-0 pb-1 text-sm">{empty}</p>
	{/if}
</section>
