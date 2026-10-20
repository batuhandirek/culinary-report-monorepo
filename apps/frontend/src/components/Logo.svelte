<script lang="ts">
	import { cn } from '#ui/lib/utils.js';

	interface Props {
		width: number;
		withText?: boolean;
		// Render without the home link — for dialogs/overlays where a stray tap must not
		// navigate away.
		noNav?: boolean;
		// Ink letters, for brand orange or any warm ground.
		ink?: boolean;
		class?: string;
	}

	let { width, noNav = false, ink = false, class: className = '' }: Props = $props();

	// A text wordmark until the product has a logo: sized from `width` like the image was.
	const fontSize = $derived(Math.round(width / 6.2));
</script>

{#snippet wordmark()}
	<span
		class={cn(
			'bg-primary inline-block rounded-md px-2 py-1 font-semibold leading-none tracking-tight whitespace-nowrap',
			ink ? 'bg-ink text-sand' : 'text-ink',
			className
		)}
		style={`font-size: ${fontSize}px;`}>
		Culinary Report
	</span>
{/snippet}

{#if noNav}
	{@render wordmark()}
{:else}
	<a
		href="/"
		aria-label="Culinary Report — home"
		class="focus-visible:ring-ring/60 w-fit rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
		{@render wordmark()}
	</a>
{/if}
