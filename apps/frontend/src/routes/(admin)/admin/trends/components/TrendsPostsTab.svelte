<script lang="ts">
	import type { AdminTrendsOutputDto, TrendRisingBrandRow } from 'client';

	import TrendBars from './TrendBars.svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { compact, monthLabel } from '#lib/culinary.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The month in posts: cuisines, dishes, districts and creators as shares, and the brands
	// climbing the top 50. Shares, not counts: a bigger scrape moves counts, not shares.
	interface Props {
		cityId: string;
		month: string;
	}

	let { cityId, month }: Props = $props();

	let trends = $state<AdminTrendsOutputDto | null>(null);
	const loader = createLoader(
		(query: { month: string; cityId: string }) => api.admin.getTrends(query),
		{ onSuccess: (res) => (trends = res) }
	);
	$effect(() => {
		trends = null;
		if (cityId) loader.load({ month, cityId });
	});

	// Cuisines and districts can be shared out by mentions or by views
	let cuisineMeasure = $state<'count' | 'views'>('count');
	let districtMeasure = $state<'count' | 'views'>('count');

	const monthName = $derived(trends ? monthLabel(trends.month) : '');
	const prevMonthName = $derived(trends ? monthLabel(trends.previousMonth) : '');

	const climb = (row: TrendRisingBrandRow) =>
		row.prevRank === undefined ? 'new in the top 50' : `up ${row.prevRank - row.rank} from #${row.prevRank}`;
</script>

{#snippet measureSwitch(value: 'count' | 'views', set: (v: 'count' | 'views') => void)}
	<div class="flex gap-1" role="group" aria-label="Share of">
		<button type="button" class="chip text-xs" aria-pressed={value === 'count'} onclick={() => set('count')}>
			Mentions
		</button>
		<button type="button" class="chip text-xs" aria-pressed={value === 'views'} onclick={() => set('views')}>
			Views
		</button>
	</div>
{/snippet}

<div class="flex min-w-0 flex-col gap-5 pb-12">
	{#if loader.error && !trends}
		<ErrorState onRetry={() => loader.load({ month, cityId })} />
	{:else if !trends}
		<div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
			{#each [0, 1, 2, 3] as i (i)}
				<AdminPanel><SkeletonRows count={6} lines={1} trailing /></AdminPanel>
			{/each}
		</div>
	{:else if trends.totals.mentions === 0}
		<EmptyState
			title={`Nothing matched in ${monthName}`}
			hint="No post of the month is linked to a venue yet. Run the pipeline for it first."
			size="sm" />
	{:else}
		<p class="text-muted-foreground m-0 text-sm">
			{monthName} against {prevMonthName}: {trends.totals.mentions} venue mentions in
			{trends.totals.posts} posts ({compact(trends.totals.views)} views), against
			{trends.prevTotals.mentions} in {trends.prevTotals.posts}. Every figure is a share of
			what the scrape found that month, so a bigger or smaller scrape moves the counts, not
			the shares. A venue's own posts are left out.
		</p>

		<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
			<AdminPanel title="Cuisines" note={cuisineMeasure === 'views' ? 'by views' : 'by mentions'}>
				{#snippet action()}
					{@render measureSwitch(cuisineMeasure, (v) => (cuisineMeasure = v))}
				{/snippet}
				<TrendBars
					rows={trends.cuisines}
					measure={cuisineMeasure}
					unit="mentions"
					{monthName}
					{prevMonthName}
					sampleLinks />
			</AdminPanel>

			<AdminPanel title="Dishes" note="posts and reviews naming them">
				<TrendBars
					rows={trends.dishes}
					unit="namings"
					{monthName}
					{prevMonthName}
					sampleLinks />
			</AdminPanel>

			<AdminPanel title="Rising brands" note="top 50 by posts from others">
				{#if trends.risingBrands.length === 0}
					<EmptyState title="No climbers" hint="The top 50 is the same as last month." ground="none" size="sm" />
				{:else}
					<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
						{#each trends.risingBrands as row (row.brandId)}
							<li class="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2">
								<span class="text-muted-foreground tabular-nums">#{row.rank}</span>
								<a href={`/admin/brands/${row.brandId}`} class="min-w-0 hover:underline">
									<span class="block truncate font-medium">{row.name}</span>
									<span class="text-muted-foreground block truncate text-xs">
										{[row.category, row.district].filter(Boolean).join(' · ')}
									</span>
								</a>
								<span class="text-right text-xs">
									<span class="block">{climb(row)}</span>
									<span class="text-muted-foreground block tabular-nums">
										{row.posts} posts · {row.share.toFixed(1)} % ({row.delta > 0 ? '+' : ''}{row.delta.toFixed(1)} pt)
									</span>
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</AdminPanel>

			<AdminPanel title="Districts" note={districtMeasure === 'views' ? 'by views' : 'by mentions'}>
				{#snippet action()}
					{@render measureSwitch(districtMeasure, (v) => (districtMeasure = v))}
				{/snippet}
				<TrendBars
					rows={trends.districts}
					measure={districtMeasure}
					unit="mentions"
					{monthName}
					{prevMonthName} />
			</AdminPanel>

			<AdminPanel title="Creators" note="by reach: share of views">
				<TrendBars
					rows={trends.creators}
					unit="posts"
					shareLabel="views"
					{monthName}
					{prevMonthName}
					detail={(row) =>
						row.other
							? undefined
							: `${row.count} ${row.count === 1 ? 'post' : 'posts'} · ${compact(row.views)} views · ${row.venues} ${row.venues === 1 ? 'venue' : 'venues'}`} />
			</AdminPanel>
		</div>
	{/if}

</div>
