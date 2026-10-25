<script lang="ts">
	import { LANDING_CITY, twoDigits } from './landing.js';

	// About the data: one line, and the method behind it on a tap (brand skill, public guardrails).
	let open = $state(false);

	const PROMISES = [
		{
			title: 'People, not posts',
			text: 'A place ranks by how many people posted about it in public in the last 30 days, then by posts and views. One account posting ten times is one voice.'
		},
		{
			title: 'No one can buy a rank',
			text: "Paid and promotional posts don't count, and neither do a place's own. Venues can buy their own numbers in a private report, never a place on a public list."
		},
		{
			title: 'Every creator is credited',
			text: 'A post we point to is credited by @handle and linked to the original. Ask us and it comes off the same day.'
		},
		{
			title: "Who's rising, never who's falling",
			text: "Public lists are positive. What a place's guests complain about stays in that place's private report."
		}
	];
</script>

<section id="data" aria-labelledby="data-title" class="scroll-mt-4 pb-[72px] md:pb-28">
	<div class="lp-wrap">
		<div class="flex flex-wrap items-center justify-between gap-x-12 gap-y-4 border-y-[3px] py-6" style="border-color: var(--lp-rule)">
			<p id="data-title" class="lp-muted m-0 max-w-[760px] flex-[1_1_480px] text-[15px] leading-normal font-medium">
				Everything on this page comes from what {LANDING_CITY.name} says about eating out, in public, on TikTok, Instagram and
				food blogs, counted again every five days. No star ratings, no editors' picks, no paid ranks.
			</p>
			<button
				type="button"
				class="font-display flex-none cursor-pointer border-0 border-b-[3px] bg-transparent p-0 text-lg font-extrabold"
				style="color: var(--lp-ink); border-color: var(--lp-rule)"
				aria-expanded={open}
				aria-controls="data-method"
				onclick={() => (open = !open)}>{open ? 'Less about the data ↑' : 'Learn more about the data behind Munchwerk →'}</button>
		</div>
		{#if open}
			<ol id="data-method" class="m-0 grid list-none grid-cols-1 gap-x-12 p-0 md:grid-cols-2">
				{#each PROMISES as promise, i (promise.title)}
					<li class="flex items-start gap-6 border-b-2 py-6" style="border-color: var(--lp-rule)">
						<span class="lp-rank w-14 flex-none text-[40px]" style="color: var(--lp-text-green)">{twoDigits(i + 1)}</span>
						<div class="flex min-w-0 flex-col gap-1.5">
							<h3 class="font-display m-0 text-[22px] leading-none font-extrabold" style="letter-spacing: -0.02em">{promise.title}</h3>
							<p class="lp-muted m-0 text-base leading-[1.45] font-medium">{promise.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>
