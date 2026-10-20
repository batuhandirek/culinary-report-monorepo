<script lang="ts">
	import type { BlogEntrySummaryOutputDto, ListBlogEntriesOutputDto } from 'client/src/Api';

	import BlogListRow from './BlogListRow.svelte';

	import { api } from '#lib/api.js';
	import SlideFetcher from '#ui/components/SlideFetcher.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Infinite-scroll entry list shared by /blog and /blog/tag/[tagId]. The first page comes
	// from the route's SSR `load` and is handed to SlideFetcher as `initialItems`, so the
	// server-rendered HTML already contains the posts (crawlers see them) and hydration
	// doesn't re-fetch page 1 — scrolling just continues from page 2. The page above owns
	// the section head and the empty state; this only lists.
	let {
		initial,
		pageSize,
		tag,
		heading = 'h3'
	}: {
		initial: ListBlogEntriesOutputDto;
		pageSize: number;
		tag?: string;
		heading?: 'h2' | 'h3';
	} = $props();

	let entries = $state<BlogEntrySummaryOutputDto[]>(initial.items);
</script>

<SlideFetcher
	bind:results={entries}
	api={api.blog.listEntries}
	filters={tag ? { tag } : {}}
	size={pageSize}
	initialItems={initial.items}
	initialTotalItems={initial.totalItems}
	initialPage={initial.page}
	endText="That's every article">
	{#snippet children()}
		<!-- Plain hairline-ruled list, like a magazine index: no outer card, the rows own
		     their padding. The rule above the first row is the section head's. -->
		<div class="divide-line flex w-full flex-col divide-y">
			{#each entries as entry (entry.id)}
				<BlogListRow {entry} {heading} />
			{/each}
		</div>
	{/snippet}
	{#snippet loadingMore()}
		<SkeletonRows count={2} leading="thumb" lines={3} boxed={false} class="w-full" />
	{/snippet}
</SlideFetcher>
