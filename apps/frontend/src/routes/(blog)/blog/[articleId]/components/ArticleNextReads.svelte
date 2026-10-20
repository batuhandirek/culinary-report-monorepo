<script lang="ts">
	import type { BlogEntrySummaryOutputDto } from 'client/src/Api';

	import BlogPostCard from './BlogPostCard.svelte';

	import Section from '#ui/wrapped/Section.svelte';

	// What to read after this one: posts on the same topic first, topped up with the newest
	// (`pickNextBlogEntries` in the load). The same three on a phone and on a desktop — the
	// article has no sidebar list that only wide screens get.
	let { entries }: { entries: BlogEntrySummaryOutputDto[] } = $props();
</script>

{#if entries.length > 0}
	<Section
		title="Read next"
		href="/blog"
		linkText="All articles"
		headingId="blog-next-reads"
		class="narrow gap-5 pb-12">
		<div class="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
			{#each entries as post (post.id)}
				<BlogPostCard entry={post} />
			{/each}
		</div>
	</Section>
{/if}
