<script lang="ts">
	import { capitalize, type Dish, DISH_KICKERS, LANDING_CITY } from './landing.js';

	// Four dishes with a role each: the Dish of the Month (its share of the posts naming a dish
	// rose the most), the next riser, the most named, the drink of the moment.
	let { dishes }: { dishes: Dish[] } = $props();

	const TILE: Record<Dish['role'], { tile: string; style: string; kicker: string }> = {
		dish_of_the_month: { tile: 'lp-span8 lp-field-beet min-h-[360px] md:min-h-[420px]', style: '', kicker: 'color: var(--lp-oat)' },
		rising: { tile: 'lp-span4 lp-field-purple min-h-[300px] md:min-h-[420px]', style: '', kicker: '' },
		most_named: { tile: 'lp-span6 lp-paper lp-tile--outline lp-tile--shadow min-h-[280px]', style: '', kicker: 'color: var(--lp-ink-muted)' },
		drink: { tile: 'lp-span6 lp-field-green min-h-[280px]', style: 'border: 3px solid var(--lp-brand-ink)', kicker: '' }
	};
	const muted = (role: Dish['role']) => (role === 'most_named' ? 'color: var(--lp-ink-muted)' : '');
</script>

{#if dishes.length}
	<section id="dishes" aria-labelledby="dishes-title" class="lp-section scroll-mt-4">
		<div class="lp-wrap flex flex-col gap-12">
			<div class="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
				<h2 id="dishes-title" class="lp-display lp-h2 min-w-0 flex-[1_1_520px]">What {LANDING_CITY.name}'s actually eating.</h2>
				<p class="lp-lede lp-muted max-w-[460px] flex-[1_1_320px]">
					The dishes the city couldn't put down in the last 30 days, and where it got them.
				</p>
			</div>
			<div class="lp-bento">
				{#each dishes as dish (dish.key)}
					{@const t = TILE[dish.role]}
					<article class={['lp-tile', t.tile]} style={t.style}>
						<div class="flex items-center justify-between gap-4">
							{#if dish.role === 'dish_of_the_month'}
								<span class="lp-stamp" style={t.kicker}>{DISH_KICKERS[dish.role]}</span>
								{#if dish.sticker}<span class="lp-sticker lp-sticker--oat lp-tilt-right lp-tile__spin text-base">{capitalize(dish.sticker)}</span>{/if}
							{:else}
								<span class="lp-stamp-line" style={t.kicker}>{DISH_KICKERS[dish.role]}</span>
							{/if}
						</div>
						<div class="flex flex-col gap-4">
							<h3 class={['lp-display', dish.role === 'dish_of_the_month' ? 'text-[clamp(44px,7vw,104px)]' : 'lp-h3']} style="letter-spacing: -0.05em">
								{capitalize(dish.label)}
							</h3>
							<p class="lp-said max-w-[640px]" style={muted(dish.role)}>{dish.text}</p>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>
{/if}
