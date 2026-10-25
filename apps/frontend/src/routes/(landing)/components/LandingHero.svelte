<script lang="ts">
	import type { LandingEditionOutputDto } from 'client';

	import { LANDING_CITY, lastDay, monthYear, movePill, type Place, placeWhere, twoDigits } from './landing.js';

	interface Props {
		edition: LandingEditionOutputDto | null;
		top: Place | undefined;
	}

	let { edition, top }: Props = $props();

	// The headline's bite: a tap takes one out of "munching." and a sticker follows the cursor
	let bitten = $state(false);
	let cursor = $state<{ x: number; y: number } | null>(null);

	const onMove = (e: MouseEvent) => {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
	};

	const pill = $derived(top ? movePill(top) : null);
	const lede = $derived(
		edition?.copy.lede ??
			`What ${LANDING_CITY.name} posts about eating out, counted from public TikTok, Instagram and blog posts every five days. The first edition is being counted.`
	);
</script>

<section
	id="top"
	aria-label="Intro"
	class="lp-field-green relative overflow-hidden pt-10 pb-16 md:pt-14 md:pb-20"
	onmousemove={onMove}
	onmouseleave={() => (cursor = null)}>
	<span
		class="lp-sticker lp-sticker--ink lp-follow hidden md:inline-block"
		style={cursor
			? `transform: translate(${cursor.x + 22}px, ${cursor.y + 22}px) rotate(-6deg); opacity: 1`
			: 'opacity: 0; transform: translate(-200px, -200px)'}
		aria-hidden="true">{bitten ? 'nom.' : 'Take a bite →'}</span>
	<div class="lp-wrap relative flex flex-col gap-10">
		<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
			<div class="flex flex-wrap items-center gap-4">
				{#if edition}
					<span class="lp-stamp lp-stamp--solid text-xs" style="--lp-field-inverse: var(--lp-brand-ink); --lp-on-field-inverse: var(--lp-oat)">
						{monthYear(lastDay(edition))}
					</span>
				{/if}
				<span class="text-base font-bold">{LANDING_CITY.name} edition</span>
			</div>
			<span class="lp-fade inline-flex items-center gap-2.5 text-base font-bold"><span class="lp-live" aria-hidden="true"></span>Live from the city's feeds</span>
		</div>

		<h1 class="lp-display lp-giant relative">
			<span class="lp-mask"><span class="lp-rise lp-d1">What</span></span>
			<span class="lp-mask"><span class="lp-rise lp-d2">{LANDING_CITY.name}'s</span></span>
			<span class="lp-mask" style="overflow: visible">
				<span class="lp-rise lp-d3 relative">
					<button
						class={['lp-bitebtn', bitten && 'lp-bitebtn--bitten']}
						type="button"
						onclick={() => (bitten = !bitten)}
						aria-pressed={bitten}
						aria-label="Take a bite out of the word munching">munching.</button>
					{#if bitten}
						<span class="lp-crumb" style="--dx: 60px; --dy: 90px; right: 6%; top: 10%" aria-hidden="true"></span>
						<span class="lp-crumb" style="--dx: -40px; --dy: 120px; right: 9%; top: 14%; width: 9px; height: 9px" aria-hidden="true"></span>
						<span class="lp-crumb" style="--dx: 110px; --dy: 40px; right: 4%; top: 18%; width: 11px; height: 11px" aria-hidden="true"></span>
					{/if}
				</span>
			</span>
		</h1>

		<div class="lp-fade flex flex-wrap items-end justify-between gap-x-16 gap-y-10">
			<div class="flex min-w-0 flex-[1_1_460px] flex-col gap-7">
				<p class="lp-lede max-w-[640px]" style="font-weight: 600">{lede}</p>
				<div class="flex flex-wrap items-center gap-4">
					<a class="lp-button text-lg md:text-xl" href="#heat">{edition ? 'See the top 10 ↓' : 'How it works ↓'}</a>
					<a class="lp-button lp-button--oat text-lg md:text-xl" href="#newsletter">Get it monthly</a>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-x-10 gap-y-8">
				{#if top}
					<a
						href="#heat"
						class="lp-ticket lp-field-oat flex min-w-[240px] flex-col gap-2.5 border-4 px-6 pt-5 pb-[22px] no-underline"
						style="border-color: var(--lp-brand-ink); box-shadow: 10px 10px 0 var(--lp-brand-ink); color: var(--lp-brand-ink)">
						<div class="flex items-center justify-between gap-4">
							<span class="lp-stamp-line text-[10px]" style="color: #5e556a">Heat Check · {twoDigits(top.rank)}</span>
							{#if pill}<span class={['lp-move', pill.kind === 'new' && 'lp-move--new', pill.kind === 'flat' && 'lp-move--flat']} style="font-size: 13px">{pill.label}</span>{/if}
						</div>
						<span class="lp-display max-w-[320px] text-[34px] md:text-[40px]" style="letter-spacing: -0.045em">{top.name}</span>
						<span class="max-w-[320px] text-sm font-semibold" style="color: #5e556a">
							{[top.branches > 1 ? placeWhere(top) : top.district, top.tagline].filter(Boolean).join(' · ')}
						</span>
					</a>
				{/if}
				<svg class="lp-spin h-auto w-[clamp(120px,12vw,180px)] flex-none" viewBox="0 0 200 200" role="img" aria-label="Munchwerk {LANDING_CITY.name}, what the city's munching">
					<defs><path id="lp-circ" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"></path></defs>
					<circle cx="100" cy="100" r="96" fill="var(--lp-brand-ink)"></circle>
					<circle cx="100" cy="100" r="34" fill="var(--lp-acid)"></circle>
					<text font-family="var(--font-pixel)" font-size="13" letter-spacing="2" fill="var(--lp-acid)">
						<textPath href="#lp-circ">MUNCHWERK {LANDING_CITY.name.toUpperCase()} · WHAT THE CITY'S MUNCHING · </textPath>
					</text>
				</svg>
			</div>
		</div>
	</div>
</section>
