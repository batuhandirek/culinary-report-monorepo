<script lang="ts">
	import { VENUES_MAILTO } from './landing.js';

	// Munchwerk for Venues: the paid report, on the night field. The card beside it is an example,
	// labelled as one, with a made-up place: a real name there would read as a customer.
	const POINTS = [
		'Your posts, views and creators, month by month',
		'Your dishes, ranked by mentions',
		'Private to you. Never changes a public rank.'
	];
	const EXAMPLE = [
		{ value: '347', label: 'posts', style: 'border: 3px solid var(--lp-brand-ink)' },
		{ value: '1.1M', label: 'views', style: 'background: var(--lp-acid); border: 3px solid var(--lp-brand-ink)' },
		{ value: '02', label: 'in the city', style: 'background: var(--lp-brand-ink); color: var(--lp-oat); border: 3px solid var(--lp-brand-ink)', acid: true }
	];
</script>

<section id="venues" aria-labelledby="venues-title" class="lp-field-purple-deep lp-section scroll-mt-4 overflow-hidden border-t-4" style="border-color: var(--lp-brand-ink)">
	<div class="lp-wrap flex flex-wrap items-center gap-x-16 gap-y-14">
		<div class="flex min-w-0 flex-[1_1_480px] flex-col gap-7" style="color: var(--lp-oat)">
			<span class="lp-stamp self-start" style="color: var(--lp-acid)">Munchwerk for Venues</span>
			<h2 id="venues-title" class="lp-display lp-h2" style="color: var(--lp-oat)">Word of mouth, <span style="color: var(--lp-acid)">measured.</span></h2>
			<p class="lp-lede max-w-[560px]" style="color: var(--lp-lavender)">
				A private monthly report with your own numbers: who posted about you, what they filmed, how you moved against
				your Kiez, and which creators to invite back.
			</p>
			<ul class="m-0 flex list-none flex-col border-t-[3px] p-0" style="border-color: var(--lp-acid)">
				{#each POINTS as point, i (point)}
					<li class="font-display flex items-center gap-5 border-b-[3px] py-[18px] text-[clamp(18px,1.8vw,22px)] font-extrabold" style="border-color: #f2ede333; letter-spacing: -0.02em">
						<span class="lp-rank w-11 flex-none text-[28px]" style="color: var(--lp-acid)">0{i + 1}</span>{point}
					</li>
				{/each}
			</ul>
			<div class="flex flex-wrap items-center gap-5">
				<a class="lp-button lp-button--green text-lg md:text-xl" href={VENUES_MAILTO}>Get your venue's numbers</a>
				<span class="text-base font-semibold" style="color: var(--lp-lavender)">Write to hello@munchwerk.com</span>
			</div>
		</div>
		<div class="flex min-w-0 flex-[1_1_420px] justify-center py-6">
			<div
				class="lp-report lp-field-oat flex w-[460px] max-w-[calc(100%-24px)] flex-col gap-6 border-4 p-7 md:p-9"
				style="border-color: var(--lp-brand-ink)"
				role="group"
				aria-label="Example report cover">
				<div class="flex items-center justify-between">
					<span class="lp-stamp-line text-[10px]" style="color: #5e556a">Example report</span>
					<span class="lp-stamp-line text-[10px]" style="color: #5e556a">Private</span>
				</div>
				<div class="lp-display text-[clamp(38px,4vw,56px)]" style="letter-spacing: -0.045em">Your brunch got <span style="color: #4d7612">noticed.</span></div>
				<p class="m-0 text-[15px] leading-[1.45] font-medium" style="color: #5e556a">
					Prepared for Café Example, a made-up place: its posts, views and rank, the way your own report shows yours.
				</p>
				<div class="grid grid-cols-3 gap-3">
					{#each EXAMPLE as stat (stat.label)}
						<div class="flex min-w-0 flex-col gap-1 px-3 py-[18px]" style={stat.style}>
							<span class="lp-display text-[clamp(26px,3vw,38px)]" style="letter-spacing: -0.04em; {stat.acid ? 'color: var(--lp-acid)' : ''}">{stat.value}</span>
							<span class="text-xs font-semibold" style={stat.acid ? '' : 'color: #5e556a'}>{stat.label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>
