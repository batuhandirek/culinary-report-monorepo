<script lang="ts">
	import type { BlogEntrySummaryOutputDto } from 'client/src/Api';

	import BlogCover from '#components/blog/blog-cover.svelte';
	import BlogEntryMeta from '#components/blog/BlogEntryMeta.svelte';
	import { blogTagLabel } from '#lib/blog.js';

	// Vertical card for the "what to read next" grid under an article — cover on top,
	// topic, headline, byline.
	let { entry }: { entry: BlogEntrySummaryOutputDto } = $props();

	let topic = $derived(entry.tags?.[0]?.name ?? '');
</script>

<a
	href={`/blog/${entry.slug}`}
	class="group focus-visible:ring-ring flex flex-col gap-3 rounded-md outline-none focus-visible:ring-2">
	<!-- The headline below names the post; an alt here would read it twice. -->
	<BlogCover
		image={entry.coverImage}
		alt=""
		sizes="(min-width: 1288px) 400px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
		iconSize={28}
		class="rounded-md" />
	<div class="flex flex-1 flex-col gap-1.5">
		{#if topic}
			<span class="eyebrow text-beet truncate">{blogTagLabel(topic)}</span>
		{/if}
		<h3 class="type-title text-ink m-0 line-clamp-3 text-base group-hover:underline">
			{entry.title}
		</h3>
		<BlogEntryMeta {entry} author={false} />
	</div>
</a>
