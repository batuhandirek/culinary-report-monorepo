<script lang="ts">
	// The all-time Google rating at the close of each month, as a small line. Drawn only with
	// two or more points; the y range is at least 0.2 stars so a flat rating looks flat.
	interface Props {
		points: { month: string; rating?: number }[];
		width?: number;
		height?: number;
	}

	let { points, width = 76, height = 26 }: Props = $props();

	const rated = $derived(
		points.filter((p): p is { month: string; rating: number } => p.rating !== undefined)
	);
	const pad = 3;
	const path = $derived.by(() => {
		if (rated.length < 2) return undefined;
		const values = rated.map((p) => p.rating);
		const mid = (Math.max(...values) + Math.min(...values)) / 2;
		const range = Math.max(0.2, Math.max(...values) - Math.min(...values));
		const lo = mid - range / 2;
		const x = (i: number) => pad + (i / (rated.length - 1)) * (width - pad * 2);
		const y = (v: number) => height - pad - ((v - lo) / range) * (height - pad * 2);
		return {
			line: rated.map((p, i) => `${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' '),
			last: { x: x(rated.length - 1), y: y(rated.at(-1)!.rating) }
		};
	});
	const label = $derived(
		rated.length >= 2
			? `Google rating ${rated.map((p) => p.rating.toFixed(1)).join(', ')} over the last ${rated.length} months`
			: ''
	);
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
