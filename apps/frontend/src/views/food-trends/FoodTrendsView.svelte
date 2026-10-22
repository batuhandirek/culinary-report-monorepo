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
</script>

{#snippet head(title: string, note?: string)}
	<div class="section-rule">
		<h2 class="type-title text-ink m-0 text-xl md:text-2xl">{title}</h2>
		{#if note}<span class="eyebrow text-beet">{note}</span>{/if}
	</div>
{/snippet}

<article class="mx-auto flex w-full max-w-[60rem] min-w-0 flex-col gap-12 px-4 pt-10 pb-12 md:pt-14">
	<header class="flex max-w-[44rem] flex-col gap-4">
		<span class="eyebrow text-beet">{city.name} · {label}</span>
		<h1 class="text-ink m-0 text-3xl leading-tight font-semibold text-balance md:text-5xl">
			{foodTrendsTitle(city.name, quarter)}
		</h1>
		<p class="text-muted-foreground m-0 text-base leading-relaxed md:text-lg">
			{foodTrendsSummary(city.name, quarter, data)}
		</p>
	</header>

	{#if searches}
		<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-10">
			<section class="flex min-w-0 flex-col gap-4" aria-labelledby="ft-searched">
				<div class="section-rule">
					<h2 id="ft-searched" class="type-title text-ink m-0 text-xl md:text-2xl">Most searched</h2>
					<span class="eyebrow text-beet">{searches.anchor.label} = 100</span>
				</div>
				<p class="text-muted-foreground m-0 text-sm leading-relaxed">
					Google searches in {city.name}, {quarterSpan(data.months)}, on one scale: 100 is how
					much {searches.anchor.label.toLowerCase()} was searched in an average week of the last
					two years, so 50 is half that.
				</p>
				<ol class="bg-paper border-line divide-line m-0 flex list-none flex-col divide-y rounded-md border p-0">
					{#each searches.top as topic, i (topic.key)}
						<li class="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem] items-center gap-3 px-4 py-3">
							<span class="font-term text-ink text-2xl leading-none tabular-nums">{i + 1}</span>
							<div class="flex min-w-0 flex-col gap-1.5">
								<span class="text-ink truncate font-semibold">
									{topic.label}
									{#if topic.anchor}<span class="text-muted-foreground text-xs font-normal">the yardstick</span>{/if}
								</span>
								<span class="bg-wash block h-1.5 w-full rounded-full" aria-hidden="true">
									<span class="bg-primary-darker block h-1.5 rounded-full" style={width(topic.level, maxLevel)}></span>
								</span>
							</div>
							<span class="text-ink text-right font-semibold tabular-nums">{level(topic.level)}</span>
						</li>
					{/each}
				</ol>
			</section>

			{#if searches.rising.length}
				<section class="flex min-w-0 flex-col gap-4" aria-labelledby="ft-rising">
					<div class="section-rule">
						<h2 id="ft-rising" class="type-title text-ink m-0 text-xl md:text-2xl">Searched more than a year ago</h2>
					</div>
					<p class="text-muted-foreground m-0 text-sm leading-relaxed">
						The same three months a year apart, so a season (ice cream every summer) never reads as
						a trend.
					</p>
					<div class="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-xs" aria-hidden="true">
						<span class="inline-flex items-center gap-1.5"><span class="bg-strip-muted inline-block h-2 w-4 rounded-sm"></span>{lastYear}</span>
						<span class="inline-flex items-center gap-1.5"><span class="bg-primary-darker inline-block h-2 w-4 rounded-sm"></span>{label}</span>
					</div>
					<ul class="bg-paper border-line divide-line m-0 flex list-none flex-col divide-y rounded-md border p-0">
						{#each searches.rising as topic (topic.key)}
							<li class="flex flex-col gap-2 px-4 py-3">
								<div class="flex items-baseline justify-between gap-3">
									<span class="text-ink min-w-0 truncate font-semibold">{topic.label}</span>
									{#if topic.change !== undefined}
										<span class="text-primary-darker shrink-0 font-semibold tabular-nums">{percentUp(topic.change)}</span>
									{/if}
								</div>
								<dl class="m-0 grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 gap-y-1 text-xs">
									{#if topic.prevYearLevel !== undefined}
										<dt class="text-muted-foreground">{lastYear}</dt>
										<dd class="m-0"><span class="bg-strip-muted block h-2 rounded-sm" style={width(topic.prevYearLevel, maxRising)}></span></dd>
										<dd class="text-muted-foreground m-0 text-right tabular-nums">{level(topic.prevYearLevel)}</dd>
									{/if}
									<dt class="text-muted-foreground">{label}</dt>
									<dd class="m-0"><span class="bg-primary-darker block h-2 rounded-sm" style={width(topic.level, maxRising)}></span></dd>
									<dd class="text-ink m-0 text-right font-semibold tabular-nums">{level(topic.level)}</dd>
								</dl>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}

	{#if data.breakouts}
		<section class="flex min-w-0 flex-col gap-4" aria-label="Breakout searches">
			{@render head('Breakout searches', 'Google’s rising queries')}
			<p class="text-muted-foreground m-0 text-sm leading-relaxed">
				What people in {city.name} searched alongside each kind of food, {monthLabel(data.breakouts.from)}
				to {monthLabel(data.breakouts.to)}, rising fastest against the twelve months before. Google’s
				own words; a breakout grew more than 5,000 %.
			</p>
			<ul class="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.breakouts.queries as q (q.query)}
					<li class="bg-paper border-line flex min-w-0 flex-col gap-1 rounded-md border px-4 py-3">
						<span class="text-ink font-semibold break-words">“{q.query}”</span>
						<span class="text-muted-foreground flex items-baseline justify-between gap-3 text-sm">
							<span class="truncate">{q.topic}</span>
							{#if q.breakout}
								<span class="eyebrow text-beet shrink-0">Breakout</span>
							{:else if q.growth !== undefined}
								<span class="text-primary-darker shrink-0 font-semibold tabular-nums">+{q.growth.toLocaleString('en')} %</span>
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
				'grid grid-cols-1 items-start gap-12 lg:gap-10',
				data.talked && data.openings && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'
			]}>
			{#if data.talked}
				<section class="flex min-w-0 flex-col gap-4" aria-label="Most talked about">
					{@render head('Most talked about', 'TikTok and Instagram')}
					<p class="text-muted-foreground m-0 text-sm leading-relaxed">
						Share of the {data.talked.mentions.toLocaleString('en')} posts by others that named a
						place and its kind of food. A kind counts the ones under it (ramen counts for
						Japanese), so the shares add up to more than 100.
					</p>
					<ol class="bg-paper border-line divide-line m-0 flex list-none flex-col divide-y rounded-md border p-0">
						{#each data.talked.topics as topic (topic.key)}
							<li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3">
								<span class="text-ink truncate font-semibold">{topic.label}</span>
								<span class="text-ink text-right font-semibold tabular-nums">
									{topic.share.toFixed(0)} %
									{#if topic.gain}<span class="text-primary-darker ml-1 text-xs tabular-nums">+{topic.gain.toFixed(1)} pt</span>{/if}
								</span>
								<span class="bg-wash col-span-2 block h-1.5 w-full rounded-full" aria-hidden="true">
									<span class="bg-primary-darker block h-1.5 rounded-full" style={width(topic.share, maxShare)}></span>
								</span>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if data.openings}
				<section class="flex min-w-0 flex-col gap-4" aria-label="New places">
					{@render head('New places')}
					<div class="bg-paper border-line flex flex-col gap-4 rounded-md border p-5">
						<div class="flex items-baseline gap-3">
							<span class="font-term text-ink text-5xl leading-none tabular-nums">{data.openings.opened}</span>
							<span class="text-muted-foreground text-sm">opened, {data.openings.closed} closed</span>
						</div>
						{#if data.openings.byTopic.length}
							<table class="w-full text-sm">
								<caption class="sr-only">Openings and closures by kind of food</caption>
								<thead>
									<tr class="text-muted-foreground text-xs">
										<th scope="col" class="pb-1 text-left font-normal">Kind of food</th>
										<th scope="col" class="pb-1 text-right font-normal">Opened</th>
										<th scope="col" class="pb-1 text-right font-normal">Closed</th>
									</tr>
								</thead>
								<tbody>
									{#each data.openings.byTopic as row (row.label)}
										<tr class="border-line border-t">
											<th scope="row" class="text-ink py-1.5 text-left font-semibold">{row.label}</th>
											<td class="text-ink py-1.5 text-right tabular-nums">{row.opened}</td>
											<td class="text-muted-foreground py-1.5 text-right tabular-nums">{row.closed}</td>
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
