<script lang="ts">
	import { ArrowDown, ArrowUp, Minus } from '@lucide/svelte';
	import type { TrendShareRow } from 'client';

	import { compact } from '#lib/culinary.js';

	// One trend table as bar rows: the bar is this month's share, the tick last month's,
	// and the change is said in points beside it. Shares, so a bigger scrape moves nothing.
	interface Props {
		rows: TrendShareRow[];
		// Share the views instead of the count (cuisines, districts)
		measure?: 'count' | 'views';
		// What `count` is: "mentions", "posts"
		unit: string;
		monthName: string;
		prevMonthName: string;
		// A second line under the label: example venues, a creator's reach
		detail?: (row: TrendShareRow) => string | undefined;
		sampleLinks?: boolean;
		// What the share is of, when not the count or the views ("views" for creators)
		shareLabel?: string;
	}

	let {
		rows,
		measure = 'count',
		unit,
		monthName,
		prevMonthName,
		detail,
		sampleLinks = false,
		shareLabel
	}: Props = $props();

	const shareOf = (row: TrendShareRow) =>
		measure === 'views' ? (row.viewsShare ?? 0) : row.share;
	const prevOf = (row: TrendShareRow) =>
		measure === 'views' ? (row.prevViewsShare ?? 0) : row.prevShare;
	const deltaOf = (row: TrendShareRow) =>
		measure === 'views' ? (row.viewsDelta ?? 0) : row.delta;

	// The scale is the largest named share in either month, so no tick falls off its track.
	// "Other" is left out of it (it is often the largest) and runs to the end of its track.
	const max = $derived(
		Math.max(1, ...rows.filter((r) => !r.other).flatMap((r) => [shareOf(r), prevOf(r)]))
	);
	const width = (x: number) => `${Math.min(100, (x / max) * 100)}%`;
	const pctText = (x: number) => `${x.toFixed(1)} %`;
	const deltaText = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(1)} pt`;
	const tooltip = (row: TrendShareRow) =>
		[
			`${row.label}: ${pctText(shareOf(row))} in ${monthName}, ${pctText(prevOf(row))} in ${prevMonthName} (${deltaText(deltaOf(row))})`,
			`${row.count} ${unit} (${row.prevCount} before)`,
			row.sampleVenues?.length ? `Most named: ${row.sampleVenues.map((v) => v.name).join(', ')}` : ''
		]
			.filter(Boolean)
			.join('\n');
</script>

<div class="flex flex-col gap-2">
	<!-- Legend: two marks, two months -->
	<div class="text-muted-foreground flex items-center gap-4 text-xs">
		<span class="flex items-center gap-1.5">
			<span class="bg-primary-darker inline-block h-2.5 w-4 rounded-r-[4px]"></span>
			{monthName}
		</span>
		<span class="flex items-center gap-1.5">
			<span class="bg-ink inline-block h-3.5 w-0.5"></span>
			{prevMonthName}
		</span>
		<span class="ml-auto">share of {shareLabel ?? (measure === 'views' ? 'views' : unit)} · change</span>
	</div>

	<ul class="m-0 flex list-none flex-col p-0">
		{#each rows as row (row.key)}
			{@const share = shareOf(row)}
			{@const prev = prevOf(row)}
			{@const delta = deltaOf(row)}
			<li
				class="hover:bg-tint grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4.5rem_5rem] items-center gap-x-3 rounded-sm px-1 py-1.5 text-sm"
				title={tooltip(row)}>
				<div class="min-w-0">
					<div class="truncate" class:text-muted-foreground={row.other}>{row.label}</div>
					{#if sampleLinks && row.sampleVenues?.length}
						<div class="text-muted-foreground truncate text-xs">
							{#each row.sampleVenues as venue, i (venue.id)}
								{i ? ', ' : ''}<a href={`/admin/brands/${venue.id}`} class="hover:underline">{venue.name}</a>
							{/each}
						</div>
					{:else if detail?.(row)}
						<div class="text-muted-foreground truncate text-xs">{detail(row)}</div>
					{/if}
				</div>
				<div class="relative h-4" aria-hidden="true">
					<div
						class="absolute top-1/2 left-0 h-2.5 -translate-y-1/2 rounded-r-[4px]"
						class:bg-primary-darker={!row.other}
						class:bg-faint={row.other}
						style:width={width(share)}>
					</div>
					<div
						class="bg-ink absolute top-0 h-4 w-0.5"
						style:left={`calc(${width(prev)} - 1px)`}>
					</div>
				</div>
				<div class="text-right tabular-nums">{pctText(share)}</div>
				<div class="text-muted-foreground flex items-center justify-end gap-1 text-xs tabular-nums">
					{#if delta > 0}
						<ArrowUp class="size-3.5 shrink-0" />
					{:else if delta < 0}
						<ArrowDown class="size-3.5 shrink-0" />
					{:else}
						<Minus class="size-3.5 shrink-0" />
					{/if}
					<span class="text-ink">{deltaText(delta)}</span>
				</div>
			</li>
		{/each}
	</ul>
	<p class="text-muted-foreground m-0 text-xs">
		{compact(rows.reduce((n, r) => n + r.count, 0))}
		{unit} this month.
	</p>
</div>
