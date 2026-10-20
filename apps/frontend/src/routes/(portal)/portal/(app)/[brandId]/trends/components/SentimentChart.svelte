<script lang="ts">
	import { percent, shortMonth } from '#components/charts/month-chart.js';
	import { monthLabel } from '#lib/culinary.js';
	import { cn } from '#ui/lib/utils.js';

	/**
	 * How posts by others felt, month by month, as 100% columns: positive (olive) at the base,
	 * mixed or neutral (grey, the midpoint) between, negative (beet) on top — the report's own
	 * colours. Months without posts stay empty. The readout and the table carry the numbers.
	 */
	interface Props {
		months: string[];
		sentiment: ({ positive: number; mixed: number; neutral: number; negative: number } | null)[];
		selected: number;
		onSelect: (index: number) => void;
	}

	let { months, sentiment, selected, onSelect }: Props = $props();

	const HEIGHT = 140;
	const PAD = { top: 6, right: 10, bottom: 24, left: 10 };
	let width = $state(320);
	let hover = $state<number | null>(null);
	const active = $derived(hover ?? selected);

	const plotH = HEIGHT - PAD.top - PAD.bottom;
	const band = $derived(Math.max(1, width - PAD.left - PAD.right) / months.length);
	const columnW = $derived(Math.min(24, band * 0.62));
	const labelEvery = $derived(band >= 30 ? 1 : band >= 16 ? 2 : 3);

	const PARTS = [
		{ key: 'positive', label: 'Positive', cls: 'fill-primary-darker', swatch: 'bg-primary-darker' },
		{ key: 'middle', label: 'Mixed or neutral', cls: 'fill-strip-muted', swatch: 'bg-strip-muted' },
		{ key: 'negative', label: 'Negative', cls: 'fill-beet', swatch: 'bg-beet' }
	] as const;

	const rows = $derived(
		sentiment.map((s) => {
			if (!s) return null;
			const total = s.positive + s.mixed + s.neutral + s.negative;
			if (!total) return null;
			return {
				total,
				positive: s.positive / total,
				middle: (s.mixed + s.neutral) / total,
				negative: s.negative / total
			};
		})
	);

	// Stacked from the baseline up, a 2px paper gap between the parts
	const stack = (row: NonNullable<(typeof rows)[number]>) => {
		let base = PAD.top + plotH;
		return PARTS.map((part) => {
			const h = row[part.key] * plotH;
			const out = { ...part, y: base - h + (h > 2 ? 1 : 0), h: Math.max(0, h - (h > 2 ? 2 : 0)) };
			base -= h;
			return out;
		}).filter((part) => part.h > 0);
	};

	const indexAt = (event: MouseEvent) => {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * width;
		return Math.min(months.length - 1, Math.max(0, Math.floor((x - PAD.left) / band)));
	};

	const activeRow = $derived(rows[active]);
</script>

<section class="bg-paper border-line flex min-w-0 flex-col gap-2 rounded-md border px-4 pt-4 pb-3">
	<header class="flex flex-col gap-0.5">
		<h3 class="text-ink m-0 text-base font-semibold">How the posts felt</h3>
		<p class="text-muted-foreground m-0 text-xs">Share of posts by others each month</p>
	</header>

	<div class="flex min-h-11 flex-col justify-center" aria-live="polite">
		{#if activeRow}
			<p class="m-0 flex flex-wrap items-baseline gap-x-1.5">
				<span class="text-ink text-xl font-semibold">{percent(activeRow.positive)}</span>
				<span class="text-muted-foreground text-sm">positive · {monthLabel(months[active])}</span>
			</p>
			<p class="text-muted-foreground m-0 text-xs">
				{percent(activeRow.middle)} mixed or neutral · {percent(activeRow.negative)} negative · {activeRow.total}
				{activeRow.total === 1 ? 'post' : 'posts'}
			</p>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">No posts · {monthLabel(months[active])}</p>
		{/if}
	</div>

	<div class="w-full" bind:clientWidth={width}>
		<svg
			{width}
			height={HEIGHT}
			viewBox={`0 0 ${width} ${HEIGHT}`}
			class="focus-visible:ring-ring/50 block touch-pan-y rounded-sm outline-none focus-visible:ring-[3px] select-none"
			role="slider"
			tabindex="0"
			aria-label="Share of positive, mixed or neutral and negative posts by others per month"
			aria-valuemin={0}
			aria-valuemax={months.length - 1}
			aria-valuenow={selected}
			aria-valuetext={monthLabel(months[selected])}
			onkeydown={(e) => {
				const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
				if (!step) return;
				e.preventDefault();
				onSelect(Math.min(months.length - 1, Math.max(0, selected + step)));
			}}
			onpointermove={(e) => (hover = indexAt(e))}
			onpointerleave={() => (hover = null)}
			onclick={(e) => onSelect(indexAt(e))}>
			<rect
				x={PAD.left + band * selected}
				y={PAD.top}
				width={band}
				height={plotH}
				class="fill-wash"
				opacity="0.7" />
			<line
				x1={PAD.left}
				x2={width - PAD.right}
				y1={PAD.top + plotH}
				y2={PAD.top + plotH}
				class="stroke-line" />
			{#each rows as row, i (months[i])}
				{#if row}
					{#each stack(row) as part (part.key)}
						<rect
							x={PAD.left + band * (i + 0.5) - columnW / 2}
							y={part.y}
							width={columnW}
							height={part.h}
							rx="2"
							class={part.cls}
							opacity={i === active ? 1 : 0.85} />
					{/each}
				{/if}
				{#if (months.length - 1 - i) % labelEvery === 0}
					<text
						x={PAD.left + band * (i + 0.5)}
						y={HEIGHT - 6}
						text-anchor="middle"
						class={cn('text-[10px]', i === active ? 'fill-ink font-semibold' : 'fill-muted-foreground')}
						>{shortMonth(months[i])}</text>
				{/if}
			{/each}
		</svg>
	</div>

	<footer class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
		<div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
			{#each PARTS as part (part.key)}
				<span class="flex items-center gap-1.5">
					<span class={cn('inline-block size-2.5 rounded-sm', part.swatch)}></span>{part.label}
				</span>
			{/each}
		</div>
		<details class="text-xs">
			<summary class="text-beet cursor-pointer py-2 select-none">Table</summary>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left tabular-nums">
					<thead>
						<tr class="text-muted-foreground">
							<th class="py-1 pr-3 font-medium">Month</th>
							{#each PARTS as part (part.key)}<th class="py-1 pr-3 font-medium">{part.label}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row, i (months[i])}
							<tr class="border-line border-t">
								<td class="py-1 pr-3">{shortMonth(months[i], true)}</td>
								{#each PARTS as part (part.key)}
									<td class="py-1 pr-3">{row ? percent(row[part.key]) : '—'}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	</footer>
</section>
