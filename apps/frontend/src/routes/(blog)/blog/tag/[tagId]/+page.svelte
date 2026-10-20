<script lang="ts">
	import { Newspaper } from '@lucide/svelte';

	import type { BlogTagOutputDto, ListBlogEntriesOutputDto } from 'client/src/Api';

	import BlogEntryFeed from '../../../components/BlogEntryFeed.svelte';
	import BlogMasthead from '../../../components/BlogMasthead.svelte';
	import BlogPitchBand from '../../../components/BlogPitchBand.svelte';
	import BlogTagNav from '../../../components/BlogTagNav.svelte';

	import { page } from '$app/state';
	import { blogTagLabel, collectBlogTags } from '#lib/blog.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import Section from '#ui/wrapped/Section.svelte';

	let tag = $derived(page.data.tag as BlogTagOutputDto);
	let entries = $derived(page.data.entries as ListBlogEntriesOutputDto);
	let pageSize = $derived(page.data.pageSize as number);

	// This topic first, then the ones its posts are also filed under — the sideways moves
	// that make sense from here. "All articles" in the same row is the way back.
	let topics = $derived([
		tag,
		...collectBlogTags(entries.items, { limit: 7, exclude: tag.slug })
	]);
</script>

<BlogMasthead eyebrow="Topic" title={blogTagLabel(tag.name)}>
	<BlogTagNav tags={topics} current={tag.slug} />
</BlogMasthead>

<div class="narrow pb-12">
	{#if entries.items.length > 0}
		<Section
			title="Articles"
			note={`${entries.totalItems} ${entries.totalItems === 1 ? 'article' : 'articles'}`}
			class="gap-0">
			<!-- Keyed: moving from one topic to another reuses this page, and the feed must
			     start again from the new topic's server-loaded first page rather than refetch it. -->
			{#key tag.slug}
				<BlogEntryFeed initial={entries} {pageSize} tag={tag.slug} />
			{/key}
		</Section>
	{:else}
		<EmptyState
			icon={Newspaper}
			title="No articles on this topic yet"
			hint="New ones show up here as they are published.">
			<Button href="/blog" variant="outline">All articles</Button>
		</EmptyState>
	{/if}
</div>

<BlogPitchBand />
