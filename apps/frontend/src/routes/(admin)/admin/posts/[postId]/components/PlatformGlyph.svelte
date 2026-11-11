<script lang="ts">
	import { Newspaper } from '@lucide/svelte';

	// A post's platform as a line glyph (Lucide carries no brand marks): Instagram's camera, TikTok's
	// note, a newspaper for a blog article.
	interface Props {
		platform: string;
		class?: string;
	}

	let { platform, class: className = 'size-[18px]' }: Props = $props();
</script>

{#if platform === 'blog'}
	<Newspaper class={className} aria-hidden="true" />
{:else}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#if platform === 'tiktok'}
			<path d="M9 12a4 4 0 1 0 4 4V3c.6 2.6 2.4 4.4 5 5" />
		{:else}
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4" />
			<path d="M17.5 6.5h.01" />
		{/if}
	</svg>
{/if}
