<script lang="ts" module>
	/** Series colours in a fixed order (validated together: herb green, grape, chili, beet) */
	export const SERIES_COLORS = ['var(--primary-darker)', 'var(--grape)', 'var(--chili)', 'var(--beet)'];

	type Cell = string | number | boolean | null;

	/** A cell as a number: Postgres sends bigint and numeric as text */
	export const numberOf = (value: Cell): number | null => {
		if (typeof value === 'number') return Number.isFinite(value) ? value : null;
		if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
		return null;
	};

	export const formatNumber = (value: number | null) =>
		value === null ? '—' : Math.abs(value) >= 1000 ? Math.round(value).toLocaleString('en-GB') : String(Math.round(value * 100) / 100);
</script>

<script lang="ts">
	import type { AnalystChart } from 'sdk';

	interface Props {
		chart: AnalystChart;
		columns: string[];
		rows: Cell[][];
	}

	let { chart, columns, rows }: Props = $props();

	const MAX_BARS = 30;
	const xIndex = $derived(columns.indexOf(chart.x));
	const series = $derived(
		chart.y
			.slice(0, SERIES_COLORS.length)
			.map((name, i) => ({ name, index: columns.indexOf(name), color: SERIES_COLORS[i] }))
			.filter((s) => s.index >= 0)
	);
	const points = $derived(
		(chart.kind === 'bar' ? rows.slice(0, MAX_BARS) : rows).map((row) => ({
			label: String(row[xIndex] ?? '—'),
			values: series.map((s) => numberOf(row[s.index]))
		}))
	);
	const values = $derived(points.flatMap((p) => p.values).filter((v): v is number => v !== null));
	const max = $derived(Math.max(0, ...values));
	const min = $derived(Math.min(0, ...values));
	const span = $derived(max - min || 1);

	// Line geometry, in the SVG's own units
	const W = 640;
	const H = 200;
	const PAD = { top: 10, right: 12, bottom: 24, left: 44 };
	const innerW = W - PAD.left - PAD.right;
	const innerH = H - PAD.top - PAD.bottom;
	const xAt = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
	const yAt = (v: number) => PAD.top + innerH - ((v - min) / span) * innerH;
	const ticks = $derived([min, min + span / 2, max]);
	const xLabels = $derived.by(() => {
		const n = points.length;
		if (n <= 6) return points.map((_, i) => i);
		const step = Math.ceil(n / 6);
		return points.map((_, i) => i).filter((i) => i % step === 0 || i === n - 1);
	});
	const paths = $derived(
		series.map((s, si) => {
			let d = '';
			let pen = false;
			points.forEach((p, i) => {
				const v = p.values[si];
				if (v === null) {
					pen = false;
					return;
				}
				d += `${pen ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`;
				pen = true;
			});
			return { ...s, d };
		})
	);

	let hover = $state<number | null>(null);
	let svg = $state<SVGSVGElement>();
	const onMove = (e: PointerEvent) => {
		if (!svg || points.length === 0) return;
		const box = svg.getBoundingClientRect();
		const x = ((e.clientX - box.left) / box.width) * W;
		const i = points.length <= 1 ? 0 : Math.round(((x - PAD.left) / innerW) * (points.length - 1));
		hover = Math.max(0, Math.min(points.length - 1, i));
	};
</script>

{#if series.length > 1}
	<ul class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
		{#each series as s (s.name)}
			<li class="flex items-center gap-1.5">
				<span class="inline-block h-0.5 w-3 rounded-full" style:background={s.color}></span>{s.name}
			</li>
		{/each}
	</ul>
{/if}

{#if chart.kind === 'bar'}
	<div class="flex flex-col gap-1" role="list">
		{#each points as p, i (i)}
			<div
				role="listitem"
				class="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-2 rounded-sm py-0.5 text-xs hover:bg-wash"
				title={`${p.label}: ${p.values.map((v, si) => `${series[si].name} ${formatNumber(v)}`).join(', ')}`}>
				<span class="truncate text-ink">{p.label}</span>
				<div class="flex flex-col gap-0.5">
					{#each p.values as v, si (si)}
						<div class="flex items-center gap-1.5">
							<span
								class="block h-2.5 rounded-r-[4px]"
								style:width={`${v === null || max <= 0 ? 0 : Math.max(0.5, (Math.max(v, 0) / max) * 100)}%`}
								style:background={series[si].color}></span>
							{#if series.length === 1}
								<span class="shrink-0 tabular-nums text-muted-foreground">{formatNumber(v)}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
		{#if rows.length > MAX_BARS}
			<p class="text-xs text-muted-foreground">The first {MAX_BARS} of {rows.length} rows; the table has them all.</p>
		{/if}
	</div>
{:else}
	<div class="relative">
		<svg
			bind:this={svg}
			viewBox={`0 0 ${W} ${H}`}
			class="block h-auto w-full touch-none"
			role="img"
			aria-label={`${series.map((s) => s.name).join(', ')} by ${chart.x}`}
			onpointermove={onMove}
			onpointerleave={() => (hover = null)}>
			{#each ticks as t (t)}
				<line x1={PAD.left} x2={W - PAD.right} y1={yAt(t)} y2={yAt(t)} stroke="var(--line)" stroke-width="1" />
				<text x={PAD.left - 6} y={yAt(t) + 3} text-anchor="end" class="fill-muted-foreground text-[10px]">{formatNumber(t)}</text>
			{/each}
			{#each xLabels as i (i)}
				<text x={xAt(i)} y={H - 6} text-anchor="middle" class="fill-muted-foreground text-[10px]">{points[i].label}</text>
			{/each}
			{#each paths as s (s.name)}
				<path d={s.d} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
			{/each}
			{#if hover !== null}
				<line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--ink)" stroke-opacity="0.25" />
				{#each paths as s, si (s.name)}
					{@const v = points[hover].values[si]}
					{#if v !== null}
						<circle cx={xAt(hover)} cy={yAt(v)} r="4" fill={s.color} stroke="var(--paper)" stroke-width="2" />
					{/if}
				{/each}
			{/if}
		</svg>
		{#if hover !== null}
			<div
				class="pointer-events-none absolute top-1 rounded-sm border border-line bg-paper px-2 py-1 text-xs shadow-sm"
				style:left={`${Math.min(75, Math.max(0, (xAt(hover) / W) * 100 - 10))}%`}>
				<div class="font-semibold text-ink">{points[hover].label}</div>
				{#each series as s, si (s.name)}
					<div class="flex items-center gap-1.5 text-muted-foreground">
						<span class="inline-block size-2 rounded-full" style:background={s.color}></span>
						{s.name}: <span class="tabular-nums text-ink">{formatNumber(points[hover].values[si])}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
