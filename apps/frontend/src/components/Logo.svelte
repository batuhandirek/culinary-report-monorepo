<script lang="ts">
	import { BRAND_STACKED, BRAND_WORDMARK } from '#constants/BRAND_LOGO.js';
	import { cn } from '#ui/lib/utils.js';

	interface Props {
		/** Rendered width in px; the height follows the logo's proportions. */
		width: number;
		/** `wordmark` (one line, the default) or `stacked` (MUNCH / WERK). */
		variant?: 'wordmark' | 'stacked';
		/** Ink on oat, paper and acid; oat on grape; acid on ink and deep grape (brand skill). */
		tone?: 'ink' | 'oat' | 'acid';
		// Render without the home link — for dialogs/overlays where a stray tap must not
		// navigate away.
		noNav?: boolean;
		class?: string;
	}

	let { width, variant = 'wordmark', tone = 'ink', noNav = false, class: className = '' }: Props = $props();

	const logo = $derived(variant === 'stacked' ? BRAND_STACKED : BRAND_WORDMARK);
	const height = $derived(Math.round((width * logo.height) / logo.width));
	const TONES = { ink: 'text-ink', oat: 'text-sand', acid: 'text-acid' } as const;
</script>

{#snippet mark()}
	<svg
		viewBox={`0 0 ${logo.width} ${logo.height}`}
		{width}
		{height}
		role="img"
		aria-label="Munchwerk"
		class={cn('block shrink-0', TONES[tone], className)}>
		<path fill="currentColor" d={logo.d} />
	</svg>
{/snippet}

{#if noNav}
	{@render mark()}
{:else}
	<a
		href="/"
		aria-label="Munchwerk — home"
		class="focus-visible:ring-ring/60 inline-flex min-h-11 w-fit items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
		{@render mark()}
	</a>
{/if}
