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
</script>

{#snippet head(title: string, note?: string)}
	<div class="section-rule">
		<h2 class="type-title text-ink m-0 text-xl md:text-2xl">{title}</h2>
		{#if note}<span class="eyebrow text-beet">{note}</span>{/if}
	</div>
{/snippet}

<article class="mx-auto flex w-full max-w-[60rem] min-w-0 flex-col gap-12 px-4 pt-10 pb-12 md:pt-14">
	<header class="flex max-w-[44rem] flex-col gap-4">
		<span class="eyebrow text-beet">{city.name} · {monthName}</span>
		<h1 class="text-ink m-0 text-3xl leading-tight font-semibold text-balance md:text-5xl">
			{highlightTitle(city.name, month)}
		</h1>
		<p class="text-muted-foreground m-0 text-base leading-relaxed md:text-lg">
			{highlightSummary(city.name, month, data)}
			Together they were watched {compact(data.totals.views)} times.
		</p>
	</header>

	{#if data.brands.length}
		<section class="flex min-w-0 flex-col gap-4" aria-label="Most talked-about places">
			{@render head('Most talked-about places', 'Posts by others')}
			<ol class="bg-paper border-line divide-line m-0 flex list-none flex-col divide-y rounded-md border p-0">
				{#each data.brands as brand (brand.brandId)}
					<li class="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-3 px-4 py-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center">
						<span class="font-term text-ink text-3xl leading-none tabular-nums sm:text-4xl">{brand.rank}</span>
						<div class="flex min-w-0 flex-col gap-1.5">
							<span class="text-ink truncate text-lg font-semibold">{brand.name}</span>
							{#if place(brand)}
								<span class="text-muted-foreground truncate text-sm">{place(brand)}</span>
							{/if}
							<span class="bg-wash block h-1.5 w-full max-w-[22rem] rounded-full" aria-hidden="true">
								<span
									class="bg-primary-darker block h-1.5 rounded-full"
									style={`width: ${Math.max(4, (brand.posts / maxPosts) * 100)}%`}></span>
							</span>
						</div>
						<dl class="col-start-2 m-0 flex gap-5 text-sm sm:col-start-3 sm:justify-end">
							<div class="flex flex-col sm:items-end">
								<dt class="text-muted-foreground text-xs">Posts</dt>
								<dd class="text-ink m-0 font-semibold tabular-nums">{brand.posts}</dd>
							</div>
							<div class="flex flex-col sm:items-end">
								<dt class="text-muted-foreground text-xs">Views</dt>
								<dd class="text-ink m-0 font-semibold tabular-nums">{compact(brand.views)}</dd>
							</div>
							<div class="flex flex-col sm:items-end">
								<dt class="text-muted-foreground text-xs">Creators</dt>
								<dd class="text-ink m-0 font-semibold tabular-nums">{brand.creators}</dd>
							</div>
						</dl>
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10">
		<div class="flex min-w-0 flex-col gap-12">
			{#if data.risers.length}
				<section class="flex min-w-0 flex-col gap-4" aria-label="Climbing fastest">
					{@render head('Climbing fastest', 'Against the month before')}
					<ul class="bg-paper border-line divide-line m-0 flex list-none flex-col divide-y rounded-md border p-0">
						{#each data.risers as riser (riser.brandId)}
							<li class="flex items-center justify-between gap-4 px-4 py-3">
								<div class="flex min-w-0 flex-col">
									<span class="text-ink truncate font-semibold">{riser.name}</span>
									{#if riser.district}<span class="text-muted-foreground truncate text-sm">{riser.district}</span>{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end text-sm">
									<span class="text-primary-darker font-semibold tabular-nums">{climbLabel(riser)}</span>
									<span class="text-muted-foreground tabular-nums">{riser.prevPosts} → {riser.posts} posts</span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.creators.length}
				<section class="flex min-w-0 flex-col gap-4" aria-label="Creators to follow">
					{@render head('Creators to follow', 'By views')}
					<ul class="bg-paper border-line divide-line m-0 flex list-none flex-col divide-y rounded-md border p-0">
						{#each data.creators as creator (creator.creatorId)}
							<li class="flex items-center justify-between gap-4 px-4 py-3">
								<a
									href={creator.profileUrl}
									target="_blank"
									rel="noopener nofollow"
									class="text-beet min-w-0 truncate font-semibold hover:underline">
									@{creator.handle}
									<span class="text-muted-foreground text-xs font-normal">{PLATFORM_NAMES[creator.platform]}</span>
								</a>
								<span class="text-muted-foreground shrink-0 text-right text-sm tabular-nums">
									{compact(creator.views)} views · {creator.posts} posts · {creator.brands}
									{creator.brands === 1 ? 'place' : 'places'}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.district || data.dishes.length}
				<section class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Where and what">
					{#if data.district}
						<div class="bg-paper border-line flex flex-col gap-2 rounded-md border p-5">
							<span class="eyebrow text-beet">Most posted-about district</span>
							<span class="text-ink text-2xl font-semibold">{data.district.name}</span>
							<span class="text-muted-foreground text-sm">
								{data.district.share.toFixed(0)} % of the mentions that name a branch
							</span>
						</div>
					{/if}
					{#if data.dishes.length}
						<div class="bg-paper border-line flex flex-col gap-2 rounded-md border p-5">
							<span class="eyebrow text-beet">Dishes on the rise</span>
							<ul class="m-0 flex list-none flex-col gap-1 p-0">
								{#each data.dishes as dish (dish.label)}
									<li class="flex items-baseline justify-between gap-3">
										<span class="text-ink font-semibold">{dish.label}</span>
										<span class="text-primary-darker text-sm tabular-nums">+{dish.delta.toFixed(1)} pt</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</section>
			{/if}
		</div>

		{#if data.topPost}
			<section class="flex min-w-0 flex-col gap-4" aria-label="Most viewed post">
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
