<script lang="ts">
	import { INSTAGRAM_CITY, LANDING_CITY } from './landing.js';

	import { BRAND_WORDMARK } from '#constants/BRAND_LOGO.js';

	interface Props {
		night: boolean;
		onToggleTheme: () => void;
		/** Sections the page has: a link to a section that is not there would go nowhere */
		hasOpenings: boolean;
	}

	let { night, onToggleTheme, hasOpenings }: Props = $props();

	const links = $derived([
		{ href: '#heat', label: 'Heat Check' },
		{ href: '#dishes', label: 'Dishes' },
		...(hasOpenings ? [{ href: '#new', label: 'New in Town' }] : []),
		{ href: '#series', label: 'Series' },
		{ href: '/blog', label: 'Blog' }
	]);
</script>

<nav class="lp-nav lp-ground relative z-[2] border-b-4 border-(--lp-rule)" aria-label="Main">
	<div class="lp-wrap flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4">
		<a href="/" aria-label="Munchwerk home" class="inline-flex items-center gap-3.5" style="color: var(--lp-ink)">
			<svg viewBox="0 0 {BRAND_WORDMARK.width} {BRAND_WORDMARK.height}" class="block h-[22px] w-auto md:h-[26px]" aria-hidden="true">
				<path fill="currentColor" d={BRAND_WORDMARK.d} />
			</svg>
			<span class="lp-tag lp-tag--green text-sm">{LANDING_CITY.name}</span>
		</a>
		<div class="order-3 flex w-full flex-wrap items-center gap-x-6 gap-y-1 text-base font-bold md:order-none md:w-auto">
			{#each links as link (link.href)}
				<a href={link.href} class="inline-flex min-h-11 items-center">{link.label}</a>
			{/each}
			<a href="#venues" class="inline-flex min-h-11 items-center" style="color: var(--lp-text-purple)">For venues</a>
		</div>
		<div class="flex flex-wrap items-center gap-3.5">
			<button
				class={['lp-switch', night && 'lp-switch--night']}
				type="button"
				onclick={onToggleTheme}
				aria-pressed={night}
				aria-label="Switch between {LANDING_CITY.name} by day and {LANDING_CITY.name} by night">
				<span>{LANDING_CITY.name} by {night ? 'night' : 'day'}</span>
				<span class="lp-switch__knob" aria-hidden="true">
					<span class="block size-2.5 rounded-full" style="background: var(--lp-rule)"></span>
				</span>
			</button>
			<a class="lp-button hidden text-[15px] sm:inline-flex" href={INSTAGRAM_CITY} target="_blank" rel="noopener">Follow</a>
		</div>
	</div>
</nav>
