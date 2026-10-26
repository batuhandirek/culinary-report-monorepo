<script lang="ts">
	// A short series as a small line: the moves of the analysis section. Drawn only with two
	// or more points; `minRange` keeps a flat line flat (0.2 for stars, a few points for shares).
	interface Props {
		values: number[];
		label: string;
		minRange?: number;
		width?: number;
		height?: number;
	}

	let { values, label, minRange = 0, width = 76, height = 26 }: Props = $props();

	const pad = 3;
	const path = $derived.by(() => {
		if (values.length < 2) return undefined;
		const mid = (Math.max(...values) + Math.min(...values)) / 2;
		const range = Math.max(minRange, Math.max(...values) - Math.min(...values), 1e-9);
		const lo = mid - range / 2;
		const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
		const y = (v: number) => height - pad - ((v - lo) / range) * (height - pad * 2);
		return {
			line: values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
			last: { x: x(values.length - 1), y: y(values.at(-1)!) }
		};
	});
</script>

{#if path}
	<svg
		{width}
		{height}
		viewBox={`0 0 ${width} ${height}`}
		class="text-primary-darker shrink-0 overflow-visible"
		role="img"
		aria-label={label}>
		<polyline
			points={path.line}
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round" />
		<circle cx={path.last.x} cy={path.last.y} r="2.75" class="fill-ink" />
	</svg>
{/if}
