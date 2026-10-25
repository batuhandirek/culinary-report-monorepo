<script lang="ts">
	import { dayMonth, LANDING_CITY, type Opening } from './landing.js';
	import SeriesBadge from './SeriesBadge.svelte';

	// New in Town: places public posts first called new in the last 14 days, the three the city
	// talked about most. A post saying "new" is a lead, so the date is when the city first said
	// so, never an opening date.
	let { openings, count }: { openings: Opening[]; count: number } = $props();

	const where = (o: Opening) =>
		[o.district, o.street, `first called new ${dayMonth(o.firstSeen)}`].filter(Boolean).join(' · ');
</script>

{#if openings.length}
	<section id="new" aria-labelledby="new-title" class="lp-field-purple lp-on-grape lp-section scroll-mt-4 border-y-4" style="border-color: var(--lp-brand-ink)">
		<div class="lp-wrap flex flex-col gap-12">
			<div class="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
				<div class="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
					<div class="flex items-center gap-4">
						<SeriesBadge series="new" ring="var(--lp-oat)" />
						<span class="lp-stamp" style="color: var(--lp-oat)">New in Town · last 14 days</span>
					</div>
					<h2 id="new-title" class="lp-display lp-h2">Just opened. Already talked about.</h2>
				</div>
				<p class="lp-lede max-w-[460px] flex-[1_1_320px]">
					{count === 1 ? 'One place' : `${count} places`}
					{LANDING_CITY.name} called new in the last two weeks{count > openings.length ? `; the ${openings.length} it talked about most` : ''}.
				</p>
			</div>
			<div class="flex flex-col">
				{#each openings as opening (opening.brandId)}
					<div class="lp-open">
						<div class="flex min-w-0 flex-col gap-2.5">
							<div class="flex flex-wrap items-baseline gap-x-[18px] gap-y-1.5">
								<h3 class="lp-display lp-h4">{opening.name}</h3>
								<span class="text-[15px] font-semibold">{where(opening)}</span>
							</div>
							{#if opening.text}<p class="lp-said max-w-[720px]">{opening.text}</p>{/if}
						</div>
						<span class="lp-move lp-move--new" style="background: var(--lp-oat); color: var(--lp-brand-ink)">New</span>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}
