<script lang="ts">
	import type { CityHighlightData } from 'client';

	import HighlightPostEmbed from './HighlightPostEmbed.svelte';

	import { compact, monthLabel } from '#lib/culinary.js';
	import { climbLabel, highlightSummary, highlightTitle, PLATFORM_NAMES } from '#lib/highlights.js';

	// A city's public month: the places most posted about by others, the climbers, the most viewed
	// post, the creators, the busiest district and the dishes that rose. Our own counts only (no
	// ratings, no review text), positive lists only. The public page and the admin preview both
	// draw it, so what an admin checks is what goes out.
	interface Props {
		city: { slug: string; name: string };
		month: string;
		data: CityHighlightData;
	}

	let { city, month, data }: Props = $props();

	const monthName = $derived(monthLabel(month));
	const maxPosts = $derived(Math.max(1, ...data.brands.map((b) => b.posts)));
	const place = (b: { district?: string; category?: string }) =>
		[b.category, b.district].filter(Boolean).join(' · ');
	const rankLabel = (rank: number) => String(rank).padStart(2, '0');
</script>

{#snippet head(title: string, note?: string)}
	<div class="border-ink flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-4 pb-2">
		<h2 class="type-display text-ink m-0 text-2xl md:text-3xl">{title}</h2>
		{#if note}<span class="stamp text-muted-foreground">{note}</span>{/if}
	</div>
{/snippet}

<article class="mx-auto flex w-full max-w-[60rem] min-w-0 flex-col gap-14 px-4 pt-10 pb-12 md:pt-16">
	<header class="flex max-w-[46rem] flex-col items-start gap-5">
		<span class="bg-acid border-ink text-ink stamp-l tilt-left shadow-stamp inline-block rounded-[12px] border-[3px] px-3 pt-2.5 pb-2">
			Heat Check
		</span>
		<span class="stamp text-beet">{city.name} · {monthName}</span>
		<h1 class="type-hero text-ink m-0 text-[2.5rem] text-balance md:text-7xl">
			{highlightTitle(city.name, month)}
		</h1>
		<p class="text-muted-foreground m-0 text-base leading-relaxed md:text-xl md:leading-relaxed">
			{highlightSummary(city.name, month, data)}
			Together they were watched {compact(data.totals.views)} times.
		</p>
	</header>

	{#if data.brands.length}
		<section class="flex min-w-0 flex-col gap-5" aria-label="Most talked-about places">
			{@render head('Most talked-about places', 'Posts by others')}
			<!-- The hard shadow sits on the wrapper as a drop-shadow, so it follows the bite. -->
			<div class="[filter:drop-shadow(8px_8px_0_var(--ink))]">
				<ol class="bg-paper border-ink divide-ink/15 bite m-0 flex list-none flex-col divide-y border-[3px] p-0 [--bite:1.5rem]">
					{#each data.brands as brand, i (brand.brandId)}
						<li class="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-3 px-4 py-4 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto] sm:items-center sm:px-5">
							<span class="number-hero text-ink text-[2.5rem] sm:text-6xl">{rankLabel(brand.rank)}</span>
							<div class="flex min-w-0 flex-col gap-1.5">
								<span class="type-display text-ink truncate text-xl sm:text-2xl">{brand.name}</span>
								{#if place(brand)}
									<span class="text-muted-foreground truncate text-sm">{place(brand)}</span>
								{/if}
								<span class="mt-1 block h-3 w-full max-w-[22rem]" aria-hidden="true">
									<span
										class={['block h-3', i === 0 ? 'bg-acid border-ink border-2' : 'bg-ink']}
										style={`width: ${Math.max(4, (brand.posts / maxPosts) * 100)}%`}></span>
								</span>
							</div>
							<dl class="col-start-2 m-0 flex gap-5 text-sm sm:col-start-3 sm:justify-end">
								<div class="flex flex-col sm:items-end">
									<dt class="text-muted-foreground text-xs">Posts</dt>
									<dd class="text-ink font-display m-0 text-lg font-extrabold tabular-nums">{brand.posts}</dd>
								</div>
								<div class="flex flex-col sm:items-end">
									<dt class="text-muted-foreground text-xs">Views</dt>
									<dd class="text-ink font-display m-0 text-lg font-extrabold tabular-nums">{compact(brand.views)}</dd>
								</div>
								<div class="flex flex-col sm:items-end">
									<dt class="text-muted-foreground text-xs">Creators</dt>
									<dd class="text-ink font-display m-0 text-lg font-extrabold tabular-nums">{brand.creators}</dd>
								</div>
							</dl>
						</li>
					{/each}
				</ol>
			</div>
		</section>
	{/if}

	<div class="grid grid-cols-1 items-start gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10">
		<div class="flex min-w-0 flex-col gap-14">
			{#if data.risers.length}
				<section class="flex min-w-0 flex-col gap-5" aria-label="Climbing fastest">
					{@render head('Climbing fastest', 'Against the month before')}
					<ul class="bg-paper border-ink divide-ink/15 m-0 flex list-none flex-col divide-y border-2 p-0">
						{#each data.risers as riser (riser.brandId)}
							<li class="flex items-center justify-between gap-4 px-4 py-3">
								<div class="flex min-w-0 flex-col">
									<span class="type-display text-ink truncate text-lg">{riser.name}</span>
									{#if riser.district}<span class="text-muted-foreground truncate text-sm">{riser.district}</span>{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end text-sm">
									<span class="text-primary-darker font-display text-lg font-extrabold tabular-nums">{climbLabel(riser)}</span>
									<span class="text-muted-foreground tabular-nums">{riser.prevPosts} → {riser.posts} posts</span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.creators.length}
				<section class="flex min-w-0 flex-col gap-5" aria-label="Creators to follow">
					{@render head('Creators to follow', 'By views')}
					<ul class="bg-paper border-ink divide-ink/15 m-0 flex list-none flex-col divide-y border-2 p-0">
						{#each data.creators as creator (creator.creatorId)}
							<li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-4 py-3">
								<a
									href={creator.profileUrl}
									target="_blank"
									rel="noopener nofollow"
									class="text-grape inline-flex min-h-11 min-w-0 items-center gap-1.5 truncate font-bold hover:underline">
									@{creator.handle}
									<span class="text-muted-foreground text-xs font-normal">{PLATFORM_NAMES[creator.platform]}</span>
								</a>
								<span class="text-muted-foreground shrink-0 text-sm tabular-nums">
									{compact(creator.views)} views · {creator.posts} posts · {creator.brands}
									{creator.brands === 1 ? 'place' : 'places'}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.district || data.dishes.length}
				<section class="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2" aria-label="Where and what">
					{#if data.district}
						<div class="bg-ink text-sand flex flex-col gap-2 p-5">
							<span class="stamp text-acid">Top district</span>
							<span class="type-display text-3xl">{data.district.name}</span>
							<span class="text-sm">
								{data.district.share.toFixed(0)}% of the mentions that name a branch
							</span>
						</div>
					{/if}
					{#if data.dishes.length}
						<div class="bg-paper border-ink flex flex-col gap-2 border-2 p-5">
							<span class="stamp text-beet">Dishes rising</span>
							<ul class="m-0 flex list-none flex-col gap-1 p-0">
								{#each data.dishes as dish (dish.label)}
									<li class="flex items-baseline justify-between gap-3">
										<span class="type-display text-ink text-lg">{dish.label}</span>
										<span class="text-primary-darker text-sm font-bold tabular-nums">+{dish.delta.toFixed(1)} pt</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</section>
			{/if}
		</div>

		{#if data.topPost}
			<section class="flex min-w-0 flex-col gap-5" aria-label="Most viewed post">
				{@render head('Most viewed post')}
				<HighlightPostEmbed post={data.topPost} />
			</section>
		{/if}
	</div>

	<section class="ink-strip text-sm leading-relaxed" aria-label="How we count">
		How we count: public TikTok and Instagram posts from {monthName} that name a place in
		{city.name}, posted by someone other than the place itself. A place's own account never
		counts. Creators are people: one person's TikTok and Instagram count once. Want your place or
		your account left out? Tell us and we take it off the same day.
	</section>
</article>
