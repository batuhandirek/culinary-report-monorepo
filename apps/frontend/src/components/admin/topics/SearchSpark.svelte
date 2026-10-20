<script lang="ts">
	import { monthLabel } from '#lib/culinary.js';

	// A topic's Google searches over twelve months as one small line on its own 0–100 axis (100 is
	// its own peak, so lines compare in shape, never in level). Gaps where Google has too little data
	interface Props {
		values: (number | null)[];
		months: string[];
		label: string;
	}

	let { values, months, label }: Props = $props();

	const W = 112;
	const H = 26;
	const PAD = 3;
	const d = $derived.by(() => {
		let out = '';
		let pen = false;
		values.forEach((v, i) => {
			if (v === null) pen = false;
			else {
				const x = PAD + (i / Math.max(1, values.length - 1)) * (W - PAD * 2);
				const y = H - PAD - (v / 100) * (H - PAD * 2);
				out += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
				pen = true;
			}
		});
		return out;
	});
	const title = $derived(
		`${label}, Google searches: ` +
			months.map((m, i) => `${monthLabel(m)} ${values[i] === null ? '—' : Math.round(values[i]!)}`).join(', ')
	);
</script>

{#if values.some((v) => v !== null)}
	<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} class="block overflow-visible" role="img" aria-label={title}>
		<title>{title}</title>
		<line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} class="stroke-line" stroke-width="1" />
		<path {d} fill="none" class="stroke-primary-darker" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{:else}
	<span class="text-muted-foreground text-xs">no Google data</span>
{/if}
