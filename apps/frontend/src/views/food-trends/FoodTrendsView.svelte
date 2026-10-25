<script lang="ts">
	import type { FoodTrendsData } from 'client';

	import { monthLabel } from '#lib/culinary.js';
	import {
		foodTrendsSummary,
		foodTrendsTitle,
		percentUp,
		quarterLabel,
		quarterSpan,
		yearBefore
	} from '#lib/food-trends.js';

	// A city's quarter of food trends: Google searches put on one scale across kinds of food (the
	// anchor's two-year average is 100) and against the same quarter a year earlier, Google's own
	// rising queries, the kinds of food posts by others named, and openings counted by kind of
	// food. Topics only, rises only; no venue figure. The public page and the admin preview both
	// draw it, so what an admin checks is what goes out.
	interface Props {
		city: { slug: string; name: string };
		quarter: string;
		data: FoodTrendsData;
	}

	let { city, quarter, data }: Props = $props();

	const label = $derived(quarterLabel(quarter));
	const lastYear = $derived(quarterLabel(yearBefore(quarter)));
	const searches = $derived(data.searches);
	const maxLevel = $derived(Math.max(1, ...(searches?.top ?? []).map((t) => t.level)));
	// One scale for both years of every rising row, so the bars compare down the list too
	const maxRising = $derived(
		Math.max(1, ...(searches?.rising ?? []).flatMap((t) => [t.level, t.prevYearLevel ?? 0]))
	);
	const maxShare = $derived(Math.max(1, ...(data.talked?.topics ?? []).map((t) => t.share)));
	const width = (value: number, max: number) => `width: ${Math.max(2, (value / max) * 100)}%`;
	const level = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1));
	const rankLabel = (i: number) => String(i + 1).padStart(2, '0');
	// Story bars: ink, the one the story is about acid with an ink outline (brand skill).
	const bar = (lead: boolean) => (lead ? 'bg-acid border-ink border-2' : 'bg-ink');
</script>

{#snippet head(title: string, note?: string, id?: string)}
	<div class="border-ink flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-4 pb-2">
		<h2 {id} class="type-display text-ink m-0 text-2xl md:text-3xl">{title}</h2>
		{#if note}<span class="stamp text-muted-foreground">{note}</span>{/if}
	</div>
{/snippet}

<article class="mx-auto flex w-full max-w-[60rem] min-w-0 flex-col gap-14 px-4 pt-10 pb-12 md:pt-16">
	<header class="flex max-w-[46rem] flex-col items-start gap-5">
		<span class="bg-acid border-ink text-ink stamp-l tilt-left shadow-stamp inline-block rounded-[12px] border-[3px] px-3 pt-2.5 pb-2">
			Munchwerk Trends
		</span>
		<span class="stamp text-beet">{city.name} · {label}</span>
		<h1 class="type-hero text-ink m-0 text-[2.5rem] text-balance md:text-7xl">
			{foodTrendsTitle(city.name, quarter)}
		</h1>
		<p class="text-muted-foreground m-0 text-base leading-relaxed md:text-xl md:leading-relaxed">
			{foodTrendsSummary(city.name, quarter, data)}
		</p>
	</header>

	{#if searches}
		<div class="grid grid-cols-1 items-start gap-14 lg:grid-cols-2 lg:gap-10">
			<section class="flex min-w-0 flex-col gap-5" aria-labelledby="ft-searched">
				{@render head('Most searched', `${searches.anchor.label} = 100`, 'ft-searched')}
				<p class="text-muted-foreground m-0 text-sm leading-relaxed">
					Google searches in {city.name}, {quarterSpan(data.months)}, on one scale: 100 is how
					much {searches.anchor.label.toLowerCase()} was searched in an average week of the last
					two years, so 50 is half that.
				</p>
				<!-- The hard shadow sits on the wrapper as a drop-shadow, so it follows the bite. -->
				<div class="[filter:drop-shadow(8px_8px_0_var(--ink))]">
					<ol class="bg-paper border-ink divide-ink/15 bite m-0 flex list-none flex-col divide-y border-[3px] p-0 [--bite:1.25rem]">
						{#each searches.top as topic, i (topic.key)}
							<li class="grid grid-cols-[2.75rem_minmax(0,1fr)_3.5rem] items-center gap-3 px-4 py-3">
								<span class="number-hero text-ink text-3xl">{rankLabel(i)}</span>
								<div class="flex min-w-0 flex-col gap-1.5">
									<span class="type-display text-ink truncate text-lg">
										{topic.label}
										{#if topic.anchor}<span class="text-muted-foreground font-sans text-xs font-normal">the yardstick</span>{/if}
									</span>
									<span class="block h-3 w-full" aria-hidden="true">
										<span class={['block h-3', bar(i === 0)]} style={width(topic.level, maxLevel)}></span>
									</span>
								</div>
								<span class="font-display text-ink text-right text-lg font-extrabold tabular-nums">{level(topic.level)}</span>
							</li>
						{/each}
					</ol>
				</div>
			</section>

			{#if searches.rising.length}
				<section class="flex min-w-0 flex-col gap-5" aria-labelledby="ft-rising">
					{@render head('Searched more than a year ago', undefined, 'ft-rising')}
					<p class="text-muted-foreground m-0 text-sm leading-relaxed">
						The same three months a year apart, so a season (ice cream every summer) never reads as
						a trend.
					</p>
					<div class="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-xs" aria-hidden="true">
						<span class="inline-flex items-center gap-1.5"><span class="bg-muted-foreground inline-block h-2.5 w-4"></span>{lastYear}</span>
						<span class="inline-flex items-center gap-1.5"><span class="bg-acid border-ink inline-block h-2.5 w-4 border-2"></span>{label}</span>
					</div>
					<ul class="bg-paper border-ink divide-ink/15 m-0 flex list-none flex-col divide-y border-2 p-0">
						{#each searches.rising as topic (topic.key)}
							<li class="flex flex-col gap-2 px-4 py-3">
								<div class="flex items-baseline justify-between gap-3">
									<span class="type-display text-ink min-w-0 truncate text-lg">{topic.label}</span>
									{#if topic.change !== undefined}
										<span class="text-primary-darker font-display shrink-0 text-lg font-extrabold tabular-nums">{percentUp(topic.change)}</span>
									{/if}
								</div>
								<dl class="m-0 grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 gap-y-1.5 text-xs">
									{#if topic.prevYearLevel !== undefined}
										<dt class="text-muted-foreground">{lastYear}</dt>
										<dd class="m-0"><span class="bg-muted-foreground block h-2.5" style={width(topic.prevYearLevel, maxRising)}></span></dd>
										<dd class="text-muted-foreground m-0 text-right tabular-nums">{level(topic.prevYearLevel)}</dd>
									{/if}
									<dt class="text-muted-foreground">{label}</dt>
									<dd class="m-0"><span class="bg-acid border-ink block h-3 border-2" style={width(topic.level, maxRising)}></span></dd>
									<dd class="text-ink m-0 text-right font-bold tabular-nums">{level(topic.level)}</dd>
								</dl>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}

	{#if data.breakouts}
		<section class="flex min-w-0 flex-col gap-5" aria-label="Breakout searches">
			{@render head('Breakout searches', 'Google’s rising queries')}
			<p class="text-muted-foreground m-0 text-sm leading-relaxed">
				What people in {city.name} searched alongside each kind of food, {monthLabel(data.breakouts.from)}
				to {monthLabel(data.breakouts.to)}, rising fastest against the twelve months before. Google’s
				own words; a breakout grew more than 5,000%.
			</p>
			<ul class="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.breakouts.queries as q (q.query)}
					<li class="bg-paper border-ink flex min-w-0 flex-col gap-1 border-2 px-4 py-3">
						<span class="type-display text-ink text-lg break-words">“{q.query}”</span>
						<span class="text-muted-foreground flex items-baseline justify-between gap-3 text-sm">
							<span class="truncate">{q.topic}</span>
							{#if q.breakout}
								<span class="stamp text-grape shrink-0">Breakout</span>
							{:else if q.growth !== undefined}
								<span class="text-primary-darker shrink-0 font-bold tabular-nums">+{q.growth.toLocaleString('en')}%</span>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.talked || data.openings}
		<div
			class={[
				'grid grid-cols-1 items-start gap-14 lg:gap-10',
				data.talked && data.openings && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'
			]}>
			{#if data.talked}
				<section class="flex min-w-0 flex-col gap-5" aria-label="Most talked about">
					{@render head('Most talked about', 'TikTok and Instagram')}
					<p class="text-muted-foreground m-0 text-sm leading-relaxed">
						Share of the {data.talked.mentions.toLocaleString('en')} posts by others that named a
						place and its kind of food. A kind counts the ones under it (ramen counts for
						Japanese), so the shares add up to more than 100.
					</p>
					<ol class="bg-paper border-ink divide-ink/15 m-0 flex list-none flex-col divide-y border-2 p-0">
						{#each data.talked.topics as topic, i (topic.key)}
							<li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3">
								<span class="type-display text-ink truncate text-lg">{topic.label}</span>
								<span class="text-ink text-right font-bold tabular-nums">
									{topic.share.toFixed(0)}%
									{#if topic.gain}<span class="text-primary-darker ml-1 text-xs tabular-nums">+{topic.gain.toFixed(1)} pt</span>{/if}
								</span>
								<span class="col-span-2 block h-3 w-full" aria-hidden="true">
									<span class={['block h-3', bar(i === 0)]} style={width(topic.share, maxShare)}></span>
								</span>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if data.openings}
				<section class="flex min-w-0 flex-col gap-5" aria-label="New places">
					{@render head('New in town')}
					<!-- New in Town is a grape series: oat text, acid numbers. -->
					<div class="bg-grape text-sand flex flex-col gap-4 p-5">
						<div class="flex items-baseline gap-3">
							<span class="number-hero text-acid text-6xl">{data.openings.opened}</span>
							<span class="text-sm">opened, {data.openings.closed} closed</span>
						</div>
						{#if data.openings.byTopic.length}
							<table class="w-full text-sm">
								<caption class="sr-only">Openings and closures by kind of food</caption>
								<thead>
									<tr class="text-xs">
										<th scope="col" class="pb-1 text-left font-normal">Kind of food</th>
										<th scope="col" class="pb-1 text-right font-normal">Opened</th>
										<th scope="col" class="pb-1 text-right font-normal">Closed</th>
									</tr>
								</thead>
								<tbody>
									{#each data.openings.byTopic as row (row.label)}
										<tr class="border-sand/30 border-t">
											<th scope="row" class="py-1.5 text-left font-bold">{row.label}</th>
											<td class="py-1.5 text-right tabular-nums">{row.opened}</td>
											<td class="py-1.5 text-right tabular-nums">{row.closed}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				</section>
			{/if}
		</div>
	{/if}

	<section class="ink-strip text-sm leading-relaxed" aria-label="How we count">
		How we count:
		{#if searches}
			searches are Google Trends for {city.name}’s region in Food &amp; Drink, kinds of food compared
			five at a time, each group carrying {searches.anchor.label.toLowerCase()}, so every kind lands
			on one scale.
		{/if}
		{#if data.breakouts}
			Rising queries are Google’s own list for each kind of food, its users’ words, not ours.
		{/if}
		{#if data.talked}
			Posts are public TikTok and Instagram posts naming a place in {city.name}, by someone other than
			the place itself.
		{/if}
		{#if data.openings}
			New places are the ones a post said had just opened or Google Maps showed as new or closed,
			counted by their kind of food.
		{/if}
		We name no place on this page beyond Google’s own search words.
	</section>
</article>
