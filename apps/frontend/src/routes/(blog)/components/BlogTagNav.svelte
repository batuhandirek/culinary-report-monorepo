<script lang="ts">
	import type { BlogTagOutputDto } from 'client/src/Api';

	import { blogTagLabel } from '#lib/blog.js';
	import { scrollEdges } from '#ui/lib/scroll-edges.js';

	// Topics as navigation: "All articles" plus the tags the posts on screen carry
	// (`collectBlogTags`), as real links so each topic page is one hop from the index and
	// from any other topic. One scrolling row on a phone, wrapping from `lg`.
	let { tags, current }: { tags: BlogTagOutputDto[]; current?: string } = $props();
</script>

<nav aria-label="Topics" class="-mx-4 lg:mx-0">
	<ul
		use:scrollEdges={{ axis: 'x', follow: '[aria-current="page"]' }}
		class="scroll-fade-x no-scrollbar m-0 flex list-none gap-2 overflow-x-auto px-4 lg:flex-wrap lg:px-0">
		<li class="shrink-0">
			<a
				href="/blog"
				aria-current={current ? undefined : 'page'}
				class="chip border-line inline-flex min-h-11 items-center border">
				All articles
			</a>
		</li>
		{#each tags as tag (tag.id)}
			<li class="shrink-0">
				<a
					href={`/blog/tag/${tag.slug}`}
					aria-current={tag.slug === current ? 'page' : undefined}
					class="chip border-line inline-flex min-h-11 items-center border">
					{blogTagLabel(tag.name)}
				</a>
			</li>
		{/each}
	</ul>
</nav>
