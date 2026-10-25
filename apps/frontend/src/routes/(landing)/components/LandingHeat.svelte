<script lang="ts">
	import type { LandingEditionOutputDto } from 'client';

	import { LANDING_CITY, movePill, type Place, placeWhere, twoDigits, windowLabel } from './landing.js';
	import SeriesBadge from './SeriesBadge.svelte';

	// The live Heat Check: the ten places the most people posted about in the last 30 days, five
	// shown, the rest one tap away. Movement against the 30 days before, climbers and holders
	// only. Before the first edition the list says it is being counted.
	interface Props {
		edition: LandingEditionOutputDto | null;
		places: Place[];
		/** The newest published monthly Heat Check, if any */
		monthPath: string | null;
	}

	let { edition, places, monthPath }: Props = $props();

	let all = $state(false);
	const shown = $derived(all ? places : places.slice(0, 5));
</script>

<section id="heat" aria-labelledby="heat-title" class="lp-field-ink lp-on-ink lp-section scroll-mt-4">
	<div class="lp-wrap flex flex-col gap-12">
		<div class="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
			<div class="flex min-w-0 flex-[1_1_560px] flex-col gap-6">
				<div class="flex flex-wrap items-center gap-4">
					<SeriesBadge series="heat" />
					<span class="lp-stamp" style="color: var(--lp-acid)">Heat Check · {edition ? windowLabel(edition) : 'first edition'}</span>
				</div>
				<h2 id="heat-title" class="lp-display lp-h2" style="color: var(--lp-acid)">The places {LANDING_CITY.name} couldn't stop talking about.</h2>
				<p class="lp-lede max-w-[640px]" style="color: var(--lp-lavender)">
					{#if edition}
						The top 10 of the last 30 days, with what the city actually said. Movement is against the 30 days before.
					{:else}
						The first live edition is being counted: the ten places {LANDING_CITY.name} posts about most, every five days.
					{/if}
				</p>
			</div>
			{#if places.length > 5}
				<button
					type="button"
					class="lp-button lp-button--green flex-none text-lg"
					style="border-color: var(--lp-acid); box-shadow: 4px 4px 0 var(--lp-acid)"
					onclick={() => (all = !all)}
					aria-expanded={all}
					aria-controls="heat-list">{all ? 'Show the top 5' : `See all ${places.length} →`}</button>
			{/if}
		</div>

		{#if places.length}
			<ol id="heat-list" class="m-0 flex list-none flex-col border-t-8 p-0" style="border-color: var(--lp-acid)">
				{#each shown as place (place.brandId)}
					{@const pill = movePill(place)}
					<li class="lp-heat-row">
						<span class="lp-rank text-[clamp(56px,8.6vw,124px)]" style="color: {place.rank === 1 ? 'var(--lp-acid)' : 'var(--lp-lavender)'}">{twoDigits(place.rank)}</span>
						<div class="flex min-w-0 flex-col gap-3">
							<div class="flex flex-wrap items-baseline gap-x-[18px] gap-y-1.5">
								<h3 class="lp-display lp-h4" style="color: var(--lp-oat)">{place.name}</h3>
								{#if placeWhere(place)}<span class="text-[15px] font-semibold" style="color: var(--lp-lavender)">{placeWhere(place)}</span>{/if}
							</div>
							{#if place.said}<p class="lp-said max-w-[720px]" style="color: var(--lp-oat)">{place.said}</p>{/if}
							<div class="flex flex-wrap items-center gap-3">
								{#if place.dish}<span class="lp-tag lp-tag--green self-start text-xs">Dish of the moment: {place.dish.label.toLowerCase()}</span>{/if}
								<span class="text-sm font-semibold" style="color: var(--lp-lavender)">{place.creators} {place.creators === 1 ? 'person' : 'people'} · {place.posts} {place.posts === 1 ? 'post' : 'posts'}</span>
							</div>
						</div>
						<div class="lp-heat-row__val">
							{#if pill}<span class={['lp-move', pill.kind === 'new' && 'lp-move--new', pill.kind === 'flat' && 'lp-move--flat']}>{pill.label}</span>{/if}
						</div>
					</li>
				{/each}
			</ol>
		{:else}
			<ol class="m-0 flex list-none flex-col border-t-8 p-0" style="border-color: var(--lp-acid)" aria-label="Not counted yet">
				{#each [1, 2, 3, 4, 5] as rank (rank)}
					<li class="lp-heat-row">
						<span class="lp-rank text-[clamp(56px,8.6vw,124px)]" style="color: #f2ede326">{twoDigits(rank)}</span>
						<span class="lp-display lp-h4" style="color: var(--lp-lavender)">Being counted</span>
					</li>
				{/each}
			</ol>
		{/if}

		<div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 pt-2">
			<p class="m-0 max-w-[640px] text-[15px] font-medium" style="color: var(--lp-lavender)">
				Ranked by how many people posted about each place in public. A place's own posts and paid posts don't count.
				<a href="#data" style="color: var(--lp-acid)">How we count →</a>
			</p>
			{#if places.length > 5 && !all}
				<button
					type="button"
					class="font-display cursor-pointer border-0 border-b-[3px] bg-transparent p-0 text-[22px] font-extrabold"
					style="color: var(--lp-acid); border-color: var(--lp-acid)"
					onclick={() => (all = true)}>Places 06–{twoDigits(places.length)} →</button>
			{:else if monthPath}
				<a href={monthPath} class="font-display border-b-[3px] text-[22px] font-extrabold no-underline" style="color: var(--lp-acid); border-color: var(--lp-acid)">The monthly Heat Check →</a>
			{/if}
		</div>
	</div>
</section>
