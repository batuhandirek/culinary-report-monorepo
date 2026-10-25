<script lang="ts">
	import { capitalize, type Dish, LANDING_CITY, type Place, twoDigits } from './landing.js';
	import SeriesBadge from './SeriesBadge.svelte';

	// The brand's series, each in its colour and with its badge, filled from the edition.
	interface Props {
		places: Place[];
		dishOfTheMonth: Dish | undefined;
		openingsCount: number;
		monthPath: string | null;
		trendsPath: string | null;
	}

	let { places, dishOfTheMonth, openingsCount, monthPath, trendsPath }: Props = $props();
</script>

<section id="series" aria-labelledby="series-title" class="scroll-mt-4 pb-[72px] md:pb-28">
	<div class="lp-wrap flex flex-col gap-12">
		<div class="lp-rule-top flex flex-wrap items-end justify-between gap-x-12 gap-y-6 pt-10">
			<h2 id="series-title" class="lp-display lp-h2 min-w-0 flex-[1_1_520px]">Five ways to follow the city.</h2>
			<p class="lp-lede lp-muted max-w-[440px] flex-[1_1_320px]">Every series keeps its colour and its badge. Hover one: it jumps.</p>
		</div>
		<div class="lp-bento">
			<a href={monthPath ?? '#heat'} class="lp-tile lp-span7 lp-field-green min-h-[340px] md:min-h-[400px]" style="border: 3px solid var(--lp-brand-ink)">
				<div class="flex items-center justify-between gap-4">
					<SeriesBadge series="heat" ring="var(--lp-brand-ink)" size={28} />
					<span class="lp-stamp-line">Monthly · and live here</span>
				</div>
				<div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
					<div class="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
						<h3 class="lp-display lp-h3">Heat Check</h3>
						<p class="m-0 max-w-[380px] text-lg leading-[1.35] font-semibold">The 10 places {LANDING_CITY.name} talked about most.</p>
					</div>
					{#if places.length}
						<div class="font-display flex flex-col gap-1 border-l-4 pl-4 text-xl font-extrabold" style="border-color: var(--lp-brand-ink); letter-spacing: -0.01em">
							{#each places.slice(0, 3) as p (p.brandId)}<span>{twoDigits(p.rank)} {p.name}</span>{/each}
							{#if places.length > 3}<span class="lp-stamp-line pt-1.5 text-[10px]">+ {places.length - 3} more</span>{/if}
						</div>
					{/if}
				</div>
			</a>
			<a href="#new" class="lp-tile lp-span5 lp-field-purple min-h-[340px] md:min-h-[400px]">
				<div class="flex items-center justify-between gap-4">
					<SeriesBadge series="new" ring="var(--lp-oat)" size={28} />
					<span class="lp-stamp-line">Every five days</span>
				</div>
				<div class="flex flex-col gap-3.5">
					<h3 class="lp-display lp-h3">New in Town</h3>
					<p class="m-0 text-lg leading-[1.35] font-semibold">Openings, as the city finds them. Before the queue does.</p>
					{#if openingsCount}
						<span class="lp-sticker lp-sticker--oat lp-tilt-right mt-2 self-start text-base">{openingsCount} new in two weeks</span>
					{/if}
				</div>
			</a>
			<a href="#heat" class="lp-tile lp-span4 lp-paper lp-tile--outline lp-tile--shadow min-h-[300px]">
				<div class="flex items-center justify-between gap-4">
					<SeriesBadge series="rising" size={28} />
					<span class="lp-stamp-line lp-muted">Every five days</span>
				</div>
				<div class="flex flex-col gap-3.5">
					<h3 class="lp-display lp-h3">Rising</h3>
					<p class="lp-muted m-0 text-[17px] leading-[1.35] font-medium">The fastest climbers. Who went from nowhere to everywhere.</p>
				</div>
			</a>
			<a href="#dishes" class="lp-tile lp-span4 lp-field-beet min-h-[300px]">
				<div class="flex items-center justify-between gap-4">
					<SeriesBadge series="dish" ring="var(--lp-oat)" size={28} />
					<span class="lp-stamp-line">Monthly</span>
				</div>
				<div class="flex flex-col gap-3.5">
					<h3 class="lp-display lp-h3">Dish of the Month</h3>
					<p class="m-0 text-[17px] leading-[1.35] font-medium">
						The dish the whole city filmed.{#if dishOfTheMonth}&nbsp;Right now: {capitalize(dishOfTheMonth.label).toLowerCase()}.{/if}
					</p>
				</div>
			</a>
			<a href={trendsPath ?? '#series'} class="lp-tile lp-span4 lp-field-purple-deep min-h-[300px]">
				<div class="flex items-center justify-between gap-4">
					<SeriesBadge series="trends" ring="var(--lp-acid)" size={28} />
					<span class="lp-stamp-line" style="color: var(--lp-lavender)">Quarterly</span>
				</div>
				<div class="flex flex-col gap-3.5">
					<h3 class="lp-display lp-h3" style="color: var(--lp-acid)">Munchwerk Trends</h3>
					<p class="m-0 text-[17px] leading-[1.35] font-medium" style="color: var(--lp-lavender)">
						The quarterly report. What the city will eat next.{trendsPath ? '' : ' First one soon.'}
					</p>
				</div>
			</a>
		</div>
	</div>
</section>
