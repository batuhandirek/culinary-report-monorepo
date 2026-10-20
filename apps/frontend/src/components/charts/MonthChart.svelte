<script lang="ts" module>
	/**
	 * A competitor's values over the same months, drawn as a faint line; a `dashed` one is a
	 * baseline (the district's median), drawn darker and dashed and named in the legend.
	 */
	export interface ChartComparison {
		name: string;
		values: (number | null)[];
		dashed?: boolean;
	}
</script>

<script lang="ts">
	import { type ChartBand, niceScale, shortMonth } from './month-chart.js';

	import { monthLabel } from '#lib/culinary.js';
	import { cn } from '#ui/lib/utils.js';

	/**
	 * One measure over the months: the venue's own as a line or columns in the accent, its
	 * competitors as faint grey lines (emphasis: the venue is the story). One y axis, from
	 * zero unless `zero` is off (ratings). The readout above names the active month, the hover
	 * or the picked one, values first; a tap picks a month for every chart on the page. The
	 * table under it holds every value.
	 */
	interface Props {
		title: string;
		/** One quiet line under the title: what is counted. */
		note?: string;
		months: string[];
		values: (number | null)[];
		comparisons?: ChartComparison[];
		kind?: 'line' | 'column';
		format: (value: number) => string;
		/** What one value is ("views"), after the number in the readout. */
		unit?: string;
		zero?: boolean;
		/** The y range never spans less than this (a flat rating stays flat). */
		minSpan?: number;
		/** Upper bound for a share (1) or stars (5). */
		ceiling?: number;
		venueName: string;
		selected: number;
		onSelect: (index: number) => void;
		/** The city's holidays and events, shaded where they fall inside each month */
		bands?: ChartBand[];
		/** The x axis' own labels when it is not months (weeks): the tick (null: none), the readout's and the table's */
		tickLabel?: (key: string, index: number) => string | null;
		longLabel?: (key: string) => string;
		tableLabel?: (key: string) => string;
		/** The table's first column header */
		keyHeader?: string;
		/** The legend's name for the grey lines */
		othersLabel?: string;
	}

	let {
		title,
		note,
		months,
		values,
		comparisons = [],
		kind = 'line',
		format,
		unit = '',
		zero = true,
		minSpan = 0,
		ceiling,
		venueName,
		selected,
		onSelect,
		bands = [],
		tickLabel,
		longLabel = monthLabel,
		tableLabel = (month: string) => shortMonth(month, true),
		keyHeader = 'Month',
		othersLabel = 'Competitors'
	}: Props = $props();

	const HEIGHT = 168;
	const PAD = { top: 10, right: 10, bottom: 24, left: 36 };
	let width = $state(320);
	let hover = $state<number | null>(null);
	const active = $derived(hover ?? selected);

	const plotW = $derived(Math.max(1, width - PAD.left - PAD.right));
	const plotH = HEIGHT - PAD.top - PAD.bottom;
	const band = $derived(plotW / months.length);
	const cx = (i: number) => PAD.left + band * (i + 0.5);

	const scale = $derived.by(() => {
		const all = [values, ...comparisons.map((c) => c.values)]
			.flat()
			.filter((v): v is number => v !== null);
		return niceScale(all, { zero, minSpan, ceiling });
	});
	const y = (v: number) =>
		PAD.top + plotH - ((v - scale.min) / (scale.max - scale.min || 1)) * plotH;

	/** Path segments of a series, broken where a month has no value. */
	const segments = (series: (number | null)[]) => {
		const runs: { i: number; v: number }[][] = [];
		let run: { i: number; v: number }[] = [];
		series.forEach((v, i) => {
			if (v === null) {
				if (run.length) runs.push(run);
				run = [];
			} else run.push({ i, v });
		});
		if (run.length) runs.push(run);
		return runs;
	};
	const pathOf = (run: { i: number; v: number }[]) =>
		run.map((p, k) => `${k ? 'L' : 'M'}${cx(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');

	const own = $derived(segments(values));
	const lastOwn = $derived.by(() => {
		for (let i = values.length - 1; i >= 0; i--)
			if (values[i] !== null) return { i, v: values[i]! };
		return null;
	});
	const columnW = $derived(Math.min(24, band * 0.62));

	// Month labels: every month when there is room, else every other one, newest kept
	const labelEvery = $derived(band >= 30 ? 1 : band >= 16 ? 2 : 3);
	const showLabel = (i: number) => (months.length - 1 - i) % labelEvery === 0;
	const tick = (month: string, i: number) =>
		tickLabel ? tickLabel(month, i) : showLabel(i) ? shortMonth(month) : null;

	const indexAt = (event: PointerEvent) => {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * width;
		const i = Math.floor((x - PAD.left) / band);
		return Math.min(months.length - 1, Math.max(0, i));
	};

	const activeValue = $derived(values[active] ?? null);
	const activeBands = $derived(bands.filter((b) => b.index === active));
	// A one-day holiday stays visible
	const bandX = (b: ChartBand) => PAD.left + band * (b.index + b.from);
	const bandW = (b: ChartBand) => Math.max(2, band * (b.to - b.from));
	const summary = $derived(
		`${title}, ${longLabel(months[0])} to ${longLabel(months.at(-1)!)}. ` +
			(lastOwn ? `Latest: ${format(lastOwn.v)} in ${longLabel(months[lastOwn.i])}.` : 'No data yet.')
	);
</script>

<section class="bg-paper border-line flex min-w-0 flex-col gap-2 rounded-md border px-4 pt-4 pb-3">
	<header class="flex flex-col gap-0.5">
		<h3 class="text-ink m-0 text-base font-semibold">{title}</h3>
		{#if note}<p class="text-muted-foreground m-0 text-xs">{note}</p>{/if}
	</header>

	<!-- The readout: the active month's value first, then the comparison -->
	<div class="flex min-h-11 flex-col justify-center" aria-live="polite">
		<p class="m-0 flex flex-wrap items-baseline gap-x-1.5">
			{#if activeValue !== null}
				<span class="text-ink text-xl font-semibold">{format(activeValue)}</span>
				{#if unit}<span class="text-muted-foreground text-sm">{unit}</span>{/if}
			{:else}
				<span class="text-muted-foreground text-sm">No data</span>
			{/if}
			<span class="text-muted-foreground text-sm">· {longLabel(months[active])}</span>
		</p>
		{#if activeBands.length}
			<p class="text-muted-foreground m-0 truncate text-xs">
				{activeBands.map((b) => b.label).join(' · ')}
			</p>
		{/if}
		{#if comparisons.length}
			<p class="text-muted-foreground m-0 truncate text-xs">
				{comparisons
					.map((c) => `${c.name} ${c.values[active] === null ? '—' : format(c.values[active]!)}`)
					.join(' · ')}
			</p>
		{/if}
	</div>

	<div class="w-full" bind:clientWidth={width}>
		<svg
			{width}
			height={HEIGHT}
			viewBox={`0 0 ${width} ${HEIGHT}`}
			class="focus-visible:ring-ring/50 block touch-pan-y rounded-sm outline-none focus-visible:ring-[3px] overflow-visible select-none"
			role="slider"
			tabindex="0"
			aria-label={summary}
			aria-valuemin={0}
			aria-valuemax={months.length - 1}
			aria-valuenow={selected}
			aria-valuetext={longLabel(months[selected])}
			onkeydown={(e) => {
				const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
				if (!step) return;
				e.preventDefault();
				onSelect(Math.min(months.length - 1, Math.max(0, selected + step)));
			}}
			onpointermove={(e) => (hover = indexAt(e))}
			onpointerleave={() => (hover = null)}
			onclick={(e) => onSelect(indexAt(e as unknown as PointerEvent))}>
			<!-- The picked month, behind everything -->
			<rect
				x={PAD.left + band * selected}
				y={PAD.top}
				width={band}
				height={plotH}
				class="fill-wash"
				opacity="0.7" />

			<!-- Holidays and events where they fall in the month: context, not data -->
			{#each bands as b, k (k)}
				<rect
					x={bandX(b)}
					y={PAD.top}
					width={bandW(b)}
					height={plotH}
					class={b.kind === 'holiday' ? 'fill-muted-foreground' : 'fill-line'}
					opacity={b.kind === 'holiday' ? 0.28 : 0.55}>
					<title>{b.label}</title>
				</rect>
			{/each}

			{#each scale.ticks as tick (tick)}
				<line
					x1={PAD.left}
					x2={width - PAD.right}
					y1={y(tick)}
					y2={y(tick)}
					class="stroke-line"
					stroke-width="1" />
				<text
					x={PAD.left - 6}
					y={y(tick)}
					dy="0.32em"
					text-anchor="end"
					class="fill-muted-foreground text-[10px] tabular-nums">{format(tick)}</text>
			{/each}

			{#each months as month, i (month)}
				{@const label = tick(month, i)}
				{#if label}
					<text
						x={cx(i)}
						y={HEIGHT - 6}
						text-anchor="middle"
						class={cn(
							'text-[10px]',
							i === active ? 'fill-ink font-semibold' : 'fill-muted-foreground'
						)}>{label}</text>
				{/if}
			{/each}

			{#if kind === 'column'}
				{#each values as v, i (months[i])}
					{#if v !== null && v > scale.min}
						{@const top = y(v)}
						{@const h = y(scale.min) - top}
						<path
							d={`M${cx(i) - columnW / 2},${top + h}V${top + Math.min(4, h)}q0,-${Math.min(4, h)} ${Math.min(4, h)},-${Math.min(4, h)}H${cx(i) + columnW / 2 - Math.min(4, h)}q${Math.min(4, h)},0 ${Math.min(4, h)},${Math.min(4, h)}V${top + h}Z`}
							class="fill-primary-darker"
							opacity={i === active ? 1 : 0.85} />
					{/if}
				{/each}
			{/if}

			{#each comparisons as comparison (comparison.name)}
				{#each segments(comparison.values) as run, r (r)}
					{#if run.length === 1}
						<circle
							cx={cx(run[0].i)}
							cy={y(run[0].v)}
							r="2.5"
							class={comparison.dashed ? 'fill-muted-foreground' : 'fill-strip-muted'} />
					{:else}
						<path
							d={pathOf(run)}
							fill="none"
							class={comparison.dashed ? 'stroke-muted-foreground' : 'stroke-strip-muted'}
							stroke-width="1.5"
							stroke-dasharray={comparison.dashed ? '4 3' : undefined}
							stroke-linecap="round"
							stroke-linejoin="round" />
					{/if}
				{/each}
			{/each}

			{#if kind === 'line'}
				{#each own as run, r (r)}
					{#if run.length > 1}
						<path
							d={pathOf(run)}
							fill="none"
							class="stroke-primary-darker"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round" />
					{/if}
					{#each run as point (point.i)}
						{#if run.length === 1 || point.i === active || point.i === lastOwn?.i}
							<circle
								cx={cx(point.i)}
								cy={y(point.v)}
								r="4"
								class="fill-primary-darker stroke-paper"
								stroke-width="2" />
						{/if}
					{/each}
				{/each}
			{/if}

			<!-- The crosshair follows the pointer -->
			{#if hover !== null}
				<line
					x1={cx(hover)}
					x2={cx(hover)}
					y1={PAD.top}
					y2={PAD.top + plotH}
					class="stroke-ink"
					stroke-width="1"
					opacity="0.35" />
			{/if}
		</svg>
	</div>

	<footer class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
		{#if comparisons.length}
			<div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				<span class="flex items-center gap-1.5">
					<span class="bg-primary-darker inline-block h-0.5 w-3.5 rounded-full"></span>{venueName}
				</span>
				{#if comparisons.some((c) => !c.dashed)}
					<span class="flex items-center gap-1.5">
						<span class="bg-strip-muted inline-block h-0.5 w-3.5 rounded-full"></span>{othersLabel}
					</span>
				{/if}
				{#each comparisons.filter((c) => c.dashed) as baseline (baseline.name)}
					<span class="flex items-center gap-1.5">
						<span class="border-muted-foreground inline-block w-3.5 border-t-[1.5px] border-dashed"
						></span>{baseline.name}
					</span>
				{/each}
			</div>
		{/if}
		<details class="group text-xs">
			<summary class="text-beet cursor-pointer py-2 select-none">Table</summary>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left tabular-nums">
					<thead>
						<tr class="text-muted-foreground">
							<th class="py-1 pr-3 font-medium">{keyHeader}</th>
							<th class="py-1 pr-3 font-medium">{venueName}</th>
							{#each comparisons as comparison (comparison.name)}
								<th class="py-1 pr-3 font-medium">{comparison.name}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each months as month, i (month)}
							<tr class="border-line border-t">
								<td class="py-1 pr-3">{tableLabel(month)}</td>
								<td class="text-ink py-1 pr-3">{values[i] === null ? '—' : format(values[i]!)}</td>
								{#each comparisons as comparison (comparison.name)}
									<td class="py-1 pr-3">
										{comparison.values[i] === null ? '—' : format(comparison.values[i]!)}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	</footer>
</section>
