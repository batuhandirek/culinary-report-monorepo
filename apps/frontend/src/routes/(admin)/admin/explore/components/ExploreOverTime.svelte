<script lang="ts">
	import type { AdminExploreHeadOutputDto } from 'client';

	import MonthChart from '#components/charts/MonthChart.svelte';
	import type { ExploreSide } from '#lib/explore.js';

	// X month by month in the view: the reviews and posts raising it, and their share of the
	// month's (on the same bases as the figures). A month picks: the page narrows to it.
	interface Props {
		head: AdminExploreHeadOutputDto;
		side?: ExploreSide;
		onMonth: (month: string) => void;
	}

	let { head, side, onMonth }: Props = $props();

	const n = (value: number) => value.toLocaleString('en-GB');
	const baseWord = $derived(
		side === 'praise' || side === 'complaints'
			? 'with a praise or a complaint'
			: side === 'changes'
				? 'with a praise, a complaint or a noticed change'
				: 'with a claim'
	);
	const months = $derived(head.months.map((m) => m.month));
	const selected = $derived(head.months.length - 1);
</script>

{#if head.months.length > 1}
	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
		<MonthChart
			title="Reviews and posts a month"
			note="Each raising it once, however many claims."
			{months}
			values={head.months.map((m) => m.sources)}
			kind="column"
			format={(v) => n(v)}
			venueName={head.node?.label ?? 'Everything'}
			{selected}
			onSelect={(i) => onMonth(head.months[i].month)} />
		<MonthChart
			title="Share a month"
			note={`Of the month's reviews and posts ${baseWord} in the scope.`}
			{months}
			values={head.months.map((m) => m.share)}
			kind="column"
			format={(v) => `${v.toFixed(1)} %`}
			venueName={head.node?.label ?? 'Everything'}
			{selected}
			onSelect={(i) => onMonth(head.months[i].month)} />
	</div>
{:else}
	<p class="text-muted-foreground m-0 text-sm">One month picked: widen the months at the top to see it over time.</p>
{/if}
