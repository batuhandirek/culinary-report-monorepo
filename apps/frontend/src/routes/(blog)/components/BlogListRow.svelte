<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';

	import type { BlogEntrySummaryOutputDto } from 'client/src/Api';

	import BlogCover from '#components/blog/blog-cover.svelte';
	import BlogEntryMeta from '#components/blog/BlogEntryMeta.svelte';
	import { blogTagLabel } from '#lib/blog.js';
	import Icon from '#ui/components/Icon.svelte';

	// Editorial row: thumbnail, topic, headline, excerpt, byline. The index and topic pages
	// list these inside `BlogEntryFeed`'s hairline-ruled list; the row owns its own padding.
	let {
		entry,
		heading = 'h3'
	}: {
		entry: BlogEntrySummaryOutputDto;
		/** The level that keeps the page's outline unbroken under its section head. */
		heading?: 'h2' | 'h3';
	} = $props();

	let topic = $derived(entry.tags?.[0]?.name ?? '');
</script>

<a
	href={`/blog/${entry.slug}`}
	class="group focus-visible:ring-ring flex items-center gap-4 rounded-md py-5 outline-none focus-visible:ring-2 sm:gap-6">
	<!-- The headline beside it names the post; an alt here would read it twice. -->
	<BlogCover
		image={entry.coverImage}
		alt=""
		sizes="(min-width: 640px) 200px, 104px"
		class="w-[104px] shrink-0 rounded-md sm:w-[200px]"
		iconSize={26} />
	<div class="flex min-w-0 flex-1 flex-col gap-1.5">
		{#if topic}
			<div class="eyebrow text-beet truncate">{blogTagLabel(topic)}</div>
		{/if}
		<svelte:element
			this={heading}
			class="type-title text-ink m-0 line-clamp-3 text-base group-hover:underline sm:line-clamp-2 sm:text-xl">
			{entry.title}
		</svelte:element>
		{#if entry.excerpt}
			<p
				class="text-muted-foreground m-0 line-clamp-2 hidden text-sm leading-relaxed sm:block">
				{entry.excerpt}
			</p>
		{/if}
		<BlogEntryMeta {entry} />
	</div>
	<Icon icon={ChevronRight} size={20} class="text-muted-foreground hidden shrink-0 sm:block" />
</a>
