<script lang="ts">
	// A place's (or a brand's) Google rating over time: the stars and the all-time review count,
	// two lines on one time axis, each in its own band with its own scale (two measures of
	// different size never share a y-axis). One crosshair follows the pointer across both and a
	// tooltip says the read's day, stars and count.
	interface Point {
		/** `YYYY-MM-DD` */
		date: string;
		stars?: number;
		reviews?: number;
	}
	interface Props {
		points: Point[];
		/** Each band's height */
		height?: number;
	}

	let { points, height = 64 }: Props = $props();

	let width = $state(0);
	const LEFT = 88;
	const RIGHT = 8;
	const GAP = 14;
	const PAD = 6;

	const time = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
	const t0 = $derived(time(points[0]?.date ?? '1970-01-01'));
	const t1 = $derived(time(points.at(-1)?.date ?? '1970-01-01'));
	const x = (d: string) => LEFT + (t1 === t0 ? 0.5 : (time(d) - t0) / (t1 - t0)) * Math.max(1, width - LEFT - RIGHT);

	const band = (key: 'stars' | 'reviews', top: number) => {
		const values = points.map((p) => p[key]).filter((v): v is number => v != null);
		const lo = Math.min(...values);
		const hi = Math.max(...values);
		const span = hi - lo || (key === 'stars' ? 0.2 : Math.max(1, hi * 0.05));
		const min = hi === lo ? lo - span / 2 : lo;
		const y = (v: number) => top + PAD + (1 - (v - min) / span) * (height - 2 * PAD);
		const path = points
			.filter((p) => p[key] != null)
			.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p[key]!).toFixed(1)}`)
			.join('');
		return { values, lo, hi, y, path, top };
	};
	const stars = $derived(band('stars', 0));
	const reviews = $derived(band('reviews', height + GAP));
	const total = $derived(height * 2 + GAP + 18);

	const day = (d: string, year = false) =>
		new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			...(year && { year: 'numeric' }),
			timeZone: 'UTC'
		});
	const fmtStars = (v: number) => v.toFixed(2).replace(/0$/, '');
	const fmtCount = (v: number) => v.toLocaleString('en');

	// The read nearest the pointer
	let hover = $state<number | null>(null);
	const move = (e: PointerEvent) => {
		const box = (e.currentTarget as SVGElement).getBoundingClientRect();
		const px = e.clientX - box.left;
		let best = 0;
		for (let i = 1; i < points.length; i++) {
			if (Math.abs(x(points[i].date) - px) < Math.abs(x(points[best].date) - px)) best = i;
		}
		hover = best;
	};
	const hovered = $derived(hover == null ? undefined : points[hover]);
	const last = $derived(points.at(-1));
</script>

<div class="relative min-w-0" bind:clientWidth={width}>
	{#if width}
		<svg
			{width}
			height={total}
			role="img"
			aria-label={`Google rating from ${day(points[0].date, true)} to ${day(last!.date, true)}: stars ${fmtStars(stars.values[0] ?? 0)} to ${fmtStars(stars.values.at(-1) ?? 0)}, reviews ${fmtCount(reviews.values[0] ?? 0)} to ${fmtCount(reviews.values.at(-1) ?? 0)}`}
			class="block touch-none"
			onpointermove={move}
			onpointerleave={() => (hover = null)}>
			{#each [{ b: stars, label: 'Stars', fmt: fmtStars, tone: 'text-beet' }, { b: reviews, label: 'Reviews', fmt: fmtCount, tone: 'text-primary-darker' }] as row (row.label)}
				{#if row.b.values.length}
					<!-- The band: its name, its highest and lowest value as the only ticks, a hairline floor -->
					<text x="0" y={row.b.top + height / 2 + 4} class="fill-ink text-[11px] font-semibold">{row.label}</text>
					<text x={LEFT - 6} y={row.b.y(row.b.hi) + 3.5} text-anchor="end" class="fill-muted-foreground text-[10px] tabular-nums">{row.fmt(row.b.hi)}</text>
					{#if row.b.hi !== row.b.lo}
						<text x={LEFT - 6} y={row.b.y(row.b.lo) + 3.5} text-anchor="end" class="fill-muted-foreground text-[10px] tabular-nums">{row.fmt(row.b.lo)}</text>
					{/if}
					<line x1={LEFT} x2={width - RIGHT} y1={row.b.top + height} y2={row.b.top + height} class="stroke-line" stroke-width="1" />
					<path d={row.b.path} fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class={row.tone} />
					{#if points.length === 1}
						<circle cx={x(points[0].date)} cy={row.b.y(row.b.values[0])} r="4" fill="currentColor" class={row.tone} />
					{/if}
				{/if}
			{/each}
			<!-- The time axis: first and last read -->
			<text x={LEFT} y={total - 3} class="fill-muted-foreground text-[10px]">{day(points[0].date, true)}</text>
			{#if points.length > 1}
				<text x={width - RIGHT} y={total - 3} text-anchor="end" class="fill-muted-foreground text-[10px]">{day(last!.date, true)}</text>
			{/if}
			{#if hovered}
				{@const hx = x(hovered.date)}
				<line x1={hx} x2={hx} y1="0" y2={height * 2 + GAP} class="stroke-ink/40" stroke-width="1" stroke-dasharray="2 2" />
				{#if hovered.stars != null}
					<circle cx={hx} cy={stars.y(hovered.stars)} r="4" fill="currentColor" class="text-beet stroke-paper" stroke-width="2" />
				{/if}
				{#if hovered.reviews != null}
					<circle cx={hx} cy={reviews.y(hovered.reviews)} r="4" fill="currentColor" class="text-primary-darker stroke-paper" stroke-width="2" />
				{/if}
			{/if}
			<!-- The hit area: the whole plot, not the 2px line -->
			<rect x={LEFT} y="0" width={Math.max(0, width - LEFT - RIGHT)} height={height * 2 + GAP} fill="transparent" />
		</svg>
		{#if hovered}
			{@const hx = x(hovered.date)}
			<div
				class="bg-ink text-sand pointer-events-none absolute top-0 z-10 rounded px-2 py-1 text-[11px] leading-snug whitespace-nowrap tabular-nums shadow"
				style:left="{Math.min(Math.max(hx + 8, 0), width - 130)}px">
				<div class="font-semibold">{day(hovered.date, true)}</div>
				{#if hovered.stars != null}<div>{fmtStars(hovered.stars)} ★</div>{/if}
				{#if hovered.reviews != null}<div>{fmtCount(hovered.reviews)} reviews</div>{/if}
			</div>
		{/if}
	{/if}
</div>
