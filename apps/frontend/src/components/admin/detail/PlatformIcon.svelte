<script lang="ts" module>
	export const PLATFORM_NAMES: Record<string, string> = {
		tiktok: 'TikTok',
		instagram: 'Instagram',
		blog: 'Blog',
		google: 'Google',
		tripadvisor: 'TripAdvisor'
	};
</script>

<script lang="ts">
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// A source's platform as a glyph in the admin's line style (lucide has no brand marks): TikTok's
	// note, Instagram's camera, a blog's page, Google's G, TripAdvisor's eyes. In a row it stands in
	// for the platform's name: `tip` puts the name (or the given words) in a hover tooltip.
	interface Props {
		platform: string;
		size?: number;
		class?: string;
		/** A hover tooltip: `true` for the platform's name, or the words to show */
		tip?: boolean | string;
	}

	let { platform, size = 14, class: className = '', tip }: Props = $props();
	const tipText = $derived(tip === true ? (PLATFORM_NAMES[platform] ?? platform) : tip || undefined);
</script>

{#snippet glyph()}
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={tipText ? undefined : 'true'}
		aria-label={tipText}
		role={tipText ? 'img' : undefined}
		class="shrink-0 {className}">
		{#if platform === 'tiktok'}
			<path d="M14 3v11a4 4 0 1 1-4-4" />
			<path d="M14 3c0 3 2 5 5 5" />
		{:else if platform === 'instagram'}
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4" />
		{:else if platform === 'google'}
			<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
			<path d="M20.5 12H12.5" />
		{:else if platform === 'tripadvisor'}
			<circle cx="6.5" cy="13.5" r="3.5" />
			<circle cx="17.5" cy="13.5" r="3.5" />
			<path d="M3 9c5-3.5 13-3.5 18 0" />
		{:else}
			<rect x="3" y="3" width="18" height="18" rx="4" />
			<path d="M8 9h8M8 13h8M8 17h5" />
		{/if}
	</svg>
{/snippet}

{#if tipText}
	<Tooltip text={tipText}>{@render glyph()}</Tooltip>
{:else}
	{@render glyph()}
{/if}
