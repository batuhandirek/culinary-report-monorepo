<script lang="ts">
	import type { AdminPostHashtagOutputDto } from 'client';

	import { topicHref } from '#lib/topic-format.js';

	// The handles the post tags and its hashtags, each tag to the posts carrying it and, when it
	// names one, to its food topic or brand. Ignored tags are left out; past ten, "+N more".
	interface Props {
		platform: string;
		taggedHandles?: string[];
		hashtagLinks: AdminPostHashtagOutputDto[];
	}

	let { platform, taggedHandles = [], hashtagLinks }: Props = $props();

	const hashtags = $derived(hashtagLinks.filter((l) => !l.hashtag.ignored));
	const TAGS_SHOWN = 10;
	let allTags = $state(false);
	const shown = $derived(allTags ? hashtags : hashtags.slice(0, TAGS_SHOWN));
	const profile = (handle: string) => (platform === 'tiktok' ? `https://www.tiktok.com/@${handle}` : `https://www.instagram.com/${handle}/`);
</script>

<div class="flex flex-wrap gap-x-2.5 gap-y-1">
	{#each taggedHandles as handle (handle)}
		<a class="text-beet underline-offset-2 hover:underline" href={profile(handle)} target="_blank" rel="noopener noreferrer" title="Tagged in the post">@{handle}</a>
	{/each}
	{#each shown as link (link.hashtag.id)}
		<span class="whitespace-nowrap">
			<a class="text-beet underline-offset-2 hover:underline" href={`/admin/posts?hashtag=${encodeURIComponent(link.hashtag.tag)}`} title="The posts that carry it">#{link.hashtag.tag}</a>
			{#if link.hashtag.topic}<a class="text-muted-foreground hover:text-ink underline-offset-2 hover:underline" href={topicHref(link.hashtag.topic.key)} title="The food topic it names">→ {link.hashtag.topic.label}</a>{/if}
			{#if link.hashtag.brand}<a class="text-muted-foreground hover:text-ink underline-offset-2 hover:underline" href={`/admin/brands/${link.hashtag.brand.id}`} title="The brand it names">→ {link.hashtag.brand.name}</a>{/if}
		</span>
	{/each}
	{#if hashtags.length > shown.length}
		<button type="button" class="text-beet cursor-pointer hover:underline" onclick={() => (allTags = true)}>+{hashtags.length - shown.length} more</button>
	{/if}
</div>
