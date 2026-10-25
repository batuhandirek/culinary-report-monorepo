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
		class="bg-wash border-ink shadow-hard relative mx-auto flex w-full max-w-[330px] items-center justify-center overflow-hidden border-[3px]"
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
				<span class="stamp text-beet">{platform}</span>
				<span class="type-display text-ink text-3xl tabular-nums">{compact(post.views)} views</span>
				<Button icon={Play} onclick={() => (playing = true)}>Play here</Button>
				<span class="text-muted-foreground text-xs leading-snug">
					Loads {platform}'s player, which sets its own cookies.
				</span>
			</div>
		{/if}
	</div>
	<figcaption class="text-muted-foreground mt-2 text-center text-sm leading-relaxed">
		<a href={post.profileUrl} rel="noopener nofollow" target="_blank" class="text-grape font-bold hover:underline">
			@{post.handle}</a> on {places} ·
		<a href={post.url} rel="noopener nofollow" target="_blank" class="text-grape inline-flex items-center gap-1 font-semibold hover:underline">
			Watch on {platform}<ExternalLink class="size-3.5" aria-hidden="true" />
		</a>
	</figcaption>
</figure>
