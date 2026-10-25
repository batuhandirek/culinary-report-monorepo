<script lang="ts">
	import { LANDING_CITY } from './landing.js';

	const PROMISES = ['No ads', 'No paid placements', 'No star ratings', 'Just what the city said'];
</script>

<section aria-labelledby="noads-title" class="lp-section overflow-hidden">
	<div class="lp-wrap flex flex-col gap-10">
		<h2 id="noads-title" class="lp-display text-[clamp(56px,12.4vw,190px)]" style="letter-spacing: -0.06em; line-height: 0.8">
			Nothing here is <span class="lp-strike">sponsored.</span>
		</h2>
		<div class="flex flex-wrap items-start justify-between gap-x-16 gap-y-8">
			<p class="lp-lede max-w-[640px] flex-[1_1_460px]">
				We don't take ads. No place on this page paid to be here, and none could. The lists are what
				{LANDING_CITY.name} said in public, and nothing else: paid posts and a place's own posts don't count, and if the
				city stops talking about a place, it leaves the list, whoever owns it.
			</p>
			<ul class="font-display m-0 flex max-w-[460px] flex-[1_1_320px] list-none flex-col gap-3.5 p-0 text-[clamp(22px,2vw,30px)] leading-none font-extrabold" style="letter-spacing: -0.02em">
				{#each PROMISES as promise, i (promise)}
					<li class={['flex items-center gap-4', i < PROMISES.length - 1 && 'border-b-[3px] pb-3.5']} style="border-color: var(--lp-rule)">
						<span class="lp-move text-sm" aria-hidden="true">✓</span>{promise}
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>
