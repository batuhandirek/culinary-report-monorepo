<script lang="ts">
	import type { ReportBaselineMetric, ReportCitySection, ReportTrendRow } from 'client';

	import { compact } from '#lib/culinary.js';

	// The report's city section: what is rising in the city this month, where the venue stands
	// in its kind of food, and its month against the median of the month's report venues
	interface Props {
		city: ReportCitySection;
	}

	let { city }: Props = $props();

	const ordinal = (n: number) => {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
	};
	// 0.4 → "up 40%", 1 → "up 2×"; unknown when there is no month to compare with
	const change = (c: number | undefined) =>
		c === undefined
			? 'no comparison'
			: c >= 1
				? `up ${(c + 1).toFixed(1).replace(/\.0$/, '')}×`
				: Math.abs(c) < 0.05
					? 'flat'
					: `${c > 0 ? 'up' : 'down'} ${Math.round(Math.abs(c) * 100)}%`;
	const points = (delta: number) => `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} pts`;

	const cuisine = $derived(city.cuisine);
	const kind = $derived(cuisine?.label.toLowerCase() ?? '');

	const baseline = $derived(
		[
			{
				label: 'Posts by others',
				metric: city.baseline.posts,
				format: (n: number) => String(Math.round(n))
			},
			{ label: 'Views', metric: city.baseline.views, format: (n: number) => compact(n) },
			{
				label: 'Stars this month',
				metric: city.baseline.avgStars,
				format: (n: number) => n.toFixed(1)
			},
			{
				label: 'Reply rate',
				metric: city.baseline.replyRate,
				format: (n: number) => `${Math.round(n * 100)}%`
			}
		].filter((b) => b.metric.median !== undefined)
	);
	const standing = (m: ReportBaselineMetric) =>
		m.percentile === undefined
			? m.venue === undefined
				? 'none this month'
				: ''
			: m.percentile >= 60
				? `ahead of ${m.percentile}% of them`
				: m.percentile <= 40
					? `behind ${100 - m.percentile}% of them`
					: 'around the middle';
</script>

{#snippet rising(title: string, rows: ReportTrendRow[], unit: string)}
	<div class="min-w-0">
		<p class="eyebrow text-beet m-0 mb-2">{title}</p>
		{#if rows.length}
			<ol class="m-0 flex list-none flex-col p-0">
				{#each rows as row, i (row.key)}
					<li
						class="border-line grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-2 border-t py-1.5">
						<span class="font-pixel text-muted-foreground text-[9px]">{i + 1}</span>
						<span class="truncate text-sm font-medium">{row.label}</span>
						<span class="text-xs tabular-nums whitespace-nowrap">
							{row.share.toFixed(1)}%
							<span class="text-primary-darker font-semibold">{points(row.delta)}</span>
						</span>
					</li>
				{/each}
			</ol>
			<p class="text-muted-foreground m-0 mt-1.5 text-[11px]">Share of {unit}, against last month.</p>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">Nothing clearly rising this month.</p>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	{#if cuisine}
		<p class="text-reading-ink m-0 max-w-[62ch] text-[15px] leading-snug">
			{#if cuisine.share !== undefined && cuisine.prevShare !== undefined}
				{cuisine.label} was {cuisine.share.toFixed(1)}% of what {city.cityName} posted about places,
				{cuisine.delta && Math.abs(cuisine.delta) >= 0.5
					? `${cuisine.delta > 0 ? 'up' : 'down'} from ${cuisine.prevShare.toFixed(1)}%`
					: 'about the same as last month'}.
			{/if}
			{#if cuisine.rank}
				You were one of {cuisine.venues}
				{kind} places people posted about, <strong>{ordinal(cuisine.rank)} by views</strong>.
			{:else if cuisine.venues}
				{cuisine.venues} {kind} {cuisine.venues === 1 ? 'place was' : 'places were'} posted about; nobody
				posted about you this month.
			{/if}
		</p>
	{/if}

	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
		{@render rising('Rising cuisines', city.risingCuisines, 'venue mentions')}
		{@render rising('Rising dishes', city.risingDishes, 'posts and reviews naming a dish')}
	</div>

	{#if city.searches?.length}
		<div class="min-w-0 break-inside-avoid">
			<p class="eyebrow text-beet m-0 mb-2">Searched and talked about</p>
			<ol class="m-0 flex list-none flex-col p-0">
				{#each city.searches as row (row.key)}
					<li class="border-line flex items-baseline justify-between gap-3 border-t py-2 text-[13px]">
						<span class="font-semibold">{row.label}</span>
						<span class="text-muted-foreground text-right tabular-nums">
							Google searches {change(row.searchChange)} · mentions {change(row.mentionChange)}
						</span>
					</li>
				{/each}
			</ol>
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Against last month. Searches are Google Trends interest in the region; up on social media but not in
				search is early, up in both is a trend.
			</p>
		</div>
	{/if}

	{#if baseline.length}
		<div class="break-inside-avoid">
			<p class="eyebrow text-beet m-0 mb-2">You against the city</p>
			<div
				class="bg-line border-line grid grid-cols-2 gap-px overflow-hidden rounded-md border sm:grid-cols-4">
				{#each baseline as b (b.label)}
					<div class="bg-paper flex flex-col gap-0.5 px-4 py-3">
						<span class="text-[22px] leading-none font-semibold tracking-tight tabular-nums">
							{b.metric.venue === undefined ? '—' : b.format(b.metric.venue)}
						</span>
						<span class="text-ink mt-1 text-xs font-semibold">{b.label}</span>
						<span class="text-muted-foreground text-[11px] leading-snug">
							Median {b.format(b.metric.median!)}{standing(b.metric) ? ` · ${standing(b.metric)}` : ''}
						</span>
					</div>
				{/each}
			</div>
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Medians over the {city.baseline.venues} places in {city.cityName} we report on this month. Shares are
				of the city's {compact(city.mentions)} venue mentions in posts by others, so they do not move with how
				much we collected.
			</p>
		</div>
	{/if}
</div>
