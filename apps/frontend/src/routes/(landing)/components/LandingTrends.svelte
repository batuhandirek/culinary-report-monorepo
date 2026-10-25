<script lang="ts">
	import type { LandingEditionOutputDto } from 'client';

	import { LANDING_CITY, lastDay, shortMonthYear, type StoryLine, twoDigits } from './landing.js';

	// Three things the city decided: the edition's three trend tiles, each a fact with its numbers.
	let { edition, trends }: { edition: LandingEditionOutputDto | null; trends: StoryLine[] } = $props();

	const TILES = [
		{ tile: 'lp-field-ink', rank: 'color: var(--lp-acid)', title: 'color: var(--lp-acid)', text: 'color: var(--lp-oat)' },
		{ tile: 'lp-field-purple-deep', rank: 'color: var(--lp-acid)', title: 'color: var(--lp-oat)', text: 'color: var(--lp-lavender)' },
		{ tile: 'lp-field-green', rank: '', title: '', text: '', style: 'border: 3px solid var(--lp-brand-ink)' }
	];
</script>

{#if trends.length}
	<section aria-labelledby="trends-title" class="pb-[72px] md:pb-28">
		<div class="lp-wrap flex flex-col gap-12">
			<div class="lp-rule-top flex flex-wrap items-end justify-between gap-x-12 gap-y-6 pt-10">
				<h2 id="trends-title" class="lp-display lp-h2 min-w-0 flex-[1_1_520px]">Three things {LANDING_CITY.name} decided this month.</h2>
				{#if edition}<span class="lp-stamp lp-tilt-left self-start">Trends · {shortMonthYear(lastDay(edition))}</span>{/if}
			</div>
			<div class="lp-bento">
				{#each trends as trend, i (trend.id)}
					{@const t = TILES[i % TILES.length]}
					<article class={['lp-tile lp-span4 min-h-[300px] md:min-h-[360px]', t.tile]} style={t.style ?? ''}>
						<span class="lp-rank text-[72px]" style={t.rank}>{twoDigits(i + 1)}</span>
						<div class="flex flex-col gap-3.5">
							<h3 class="lp-display lp-h3" style={t.title}>{trend.heading}</h3>
							<p class="lp-said" style={t.text}>{trend.line}</p>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>
{/if}
