<script lang="ts">
	import { INSTAGRAM_BRAND, INSTAGRAM_CITY, LANDING_CITY, TIKTOK_CITY } from './landing.js';

	import { BRAND_WORDMARK } from '#constants/BRAND_LOGO.js';
	import { userStore } from '#stores/UserStore.svelte.js';

	interface Props {
		monthPath: string | null;
		trendsPath: string | null;
		hasOpenings: boolean;
	}

	let { monthPath, trendsPath, hasOpenings }: Props = $props();

	const link = 'inline-flex min-h-11 items-center md:min-h-0';
</script>

<footer class="lp-foot lp-field-ink overflow-hidden border-t-4 pt-16 pb-8 md:pt-20" style="border-color: var(--lp-brand-ink)">
	<div class="lp-wrap flex flex-col gap-14">
		<div class="flex flex-wrap items-start justify-between gap-x-16 gap-y-12">
			<p class="m-0 max-w-[420px] flex-[1_1_320px] text-base leading-normal font-medium" style="color: var(--lp-lavender)">
				Munchwerk is what {LANDING_CITY.name}'s talking about when it talks about food. No ads, no star ratings, no paid ranks.
				Just the city, on the record.
			</p>
			<div class="flex flex-wrap gap-x-16 gap-y-8 text-base font-bold">
				<nav aria-label="Series" class="flex flex-col gap-1 md:gap-3">
					<span class="lp-stamp-line text-[10px]" style="color: var(--lp-acid)">Series</span>
					<a href={monthPath ?? '#heat'} class={link}>Heat Check</a>
					{#if hasOpenings}<a href="#new" class={link}>New in Town</a>{/if}
					<a href="#dishes" class={link}>Dish of the Month</a>
					{#if trendsPath}<a href={trendsPath} class={link}>Munchwerk Trends</a>{/if}
				</nav>
				<nav aria-label="Munchwerk" class="flex flex-col gap-1 md:gap-3">
					<span class="lp-stamp-line text-[10px]" style="color: var(--lp-acid)">Munchwerk</span>
					<a href="#data" class={link}>About the data</a>
					<a href="#venues" class={link}>For venues</a>
					<a href="/blog" class={link}>Blog</a>
					<a href="#newsletter" class={link}>Newsletter</a>
					{#if userStore.isAdmin}
						<a href="/admin" class={link}>Admin</a>
					{:else if !userStore.isLoggedIn}
						<a href="/auth/login" class={link}>Log in</a>
					{/if}
				</nav>
				<nav aria-label="Follow" class="flex flex-col gap-1 md:gap-3">
					<span class="lp-stamp-line text-[10px]" style="color: var(--lp-acid)">Follow</span>
					<a href={INSTAGRAM_CITY} target="_blank" rel="noopener" class={link}>@munchwerk.berlin</a>
					<a href={INSTAGRAM_BRAND} target="_blank" rel="noopener" class={link}>@munchwerk</a>
					<a href={TIKTOK_CITY} target="_blank" rel="noopener" class={link}>TikTok</a>
				</nav>
			</div>
		</div>
		<svg class="lp-footmark" viewBox="0 0 {BRAND_WORDMARK.width} {BRAND_WORDMARK.height}" role="img" aria-label="Munchwerk">
			<path fill="currentColor" d={BRAND_WORDMARK.d} />
		</svg>
		<div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t-[3px] pt-6 text-[13px] font-medium" style="border-color: #f2ede333; color: var(--lp-lavender)">
			<span>© {new Date().getFullYear()} Munchwerk · {LANDING_CITY.name}</span>
			<span class="lp-stamp-line text-[10px]" style="color: var(--lp-acid)">What the city's munching.</span>
		</div>
	</div>
</footer>
