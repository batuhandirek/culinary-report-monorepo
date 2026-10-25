<script lang="ts">
	import type { BlogEntrySummaryOutputDto } from 'client/src/Api';

	import BlogPostCard from './BlogPostCard.svelte';


	// What to read after this one: posts on the same topic first, topped up with the newest
	// (`pickNextBlogEntries` in the load). The same three on a phone and on a desktop — the
	// article has no sidebar list that only wide screens get.
	let { entries }: { entries: BlogEntrySummaryOutputDto[] } = $props();
</script>

{#if entries.length > 0}
	<section aria-labelledby="blog-next-reads" class="narrow flex flex-col gap-5 pb-12">
		<div class="border-ink flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-4 pb-2">
			<h2 id="blog-next-reads" class="type-display text-ink m-0 text-2xl md:text-3xl">Read next</h2>
			<a href="/blog" class="stamp text-grape hover:text-ink inline-flex min-h-11 items-center">All articles</a>
		</div>
		<div class="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
			{#each entries as post (post.id)}
				<BlogPostCard entry={post} />
			{/each}
		</div>
	</section>
{/if}
