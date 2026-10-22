<script lang="ts">
	import { ExternalLink, Play } from '@lucide/svelte';
	import type { CityHighlightPost } from 'client';

	import { compact } from '#lib/culinary.js';
	import { PLATFORM_NAMES } from '#lib/highlights.js';
	import Button from '#ui/wrapped/Button.svelte';

	// The month's most viewed post, through the platform's own embed and credited to its creator.
	// The player loads on a tap: an embed sets the platform's cookies, which nobody agreed to by
	// opening the page. The wording is the post's own: who posted, where, how many saw it.
	interface Props {
		post: CityHighlightPost;
	}

	let { post }: Props = $props();

	let playing = $state(false);
	const platform = $derived(PLATFORM_NAMES[post.platform] ?? post.platform);
	const places = $derived(post.brands.map((b) => b.name).join(', '));
</script>

<figure class="m-0 flex min-w-0 flex-col gap-3">
	<div
		class="bg-wash border-line relative mx-auto flex w-full max-w-[340px] items-center justify-center overflow-hidden rounded-md border"
		style="aspect-ratio: 9 / 16;">
		{#if playing}
			<iframe
				src={post.embedUrl}
				title={`${platform} post by @${post.handle}`}
				class="absolute inset-0 h-full w-full border-0"
				allow="encrypted-media; fullscreen; picture-in-picture"
				allowfullscreen
				loading="lazy"
				referrerpolicy="strict-origin-when-cross-origin"></iframe>
		{:else}
			<div class="flex flex-col items-center gap-3 px-6 text-center">
				<span class="eyebrow text-beet">{platform}</span>
				<span class="text-ink text-2xl font-semibold tabular-nums">{compact(post.views)} views</span>
				<Button icon={Play} onclick={() => (playing = true)}>Play here</Button>
				<span class="text-muted-foreground text-xs leading-snug">
					Loads {platform}'s player, which sets its own cookies.
				</span>
			</div>
		{/if}
	</div>
	<figcaption class="text-muted-foreground text-center text-sm leading-relaxed">
		<a href={post.profileUrl} rel="noopener nofollow" target="_blank" class="text-beet font-semibold hover:underline">
			@{post.handle}</a> on {places} ·
		<a href={post.url} rel="noopener nofollow" target="_blank" class="text-beet inline-flex items-center gap-1 hover:underline">
			Watch on {platform}<ExternalLink class="size-3.5" aria-hidden="true" />
		</a>
	</figcaption>
</figure>
