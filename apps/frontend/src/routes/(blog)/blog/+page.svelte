<script lang="ts">
	import { Newspaper } from '@lucide/svelte';

	import type { ListBlogEntriesOutputDto } from 'client/src/Api';

	import BlogEntryFeed from '../components/BlogEntryFeed.svelte';
	import BlogMasthead from '../components/BlogMasthead.svelte';
	import BlogPitchBand from '../components/BlogPitchBand.svelte';
	import BlogTagNav from '../components/BlogTagNav.svelte';

	import BlogFeaturedHero from './components/BlogFeaturedHero.svelte';

	import { page } from '$app/state';
	import { collectBlogTags } from '#lib/blog.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import Section from '#ui/wrapped/Section.svelte';

	let entries = $derived(page.data.entries as ListBlogEntriesOutputDto);
	let pageSize = $derived(page.data.pageSize as number);

	// The newest post is the lead story, so it is dropped from the list below to avoid
	// showing the same cover twice. `totalItems`/`page` stay untouched, so the infinite
	// scroller still resumes at page 2 and the remaining posts line up exactly.
	let featured = $derived(entries.items[0]);
	let rest = $derived({ ...entries, items: entries.items.slice(1) });

	// What the recent posts are about — never the full tag table, most of which has no
	// published post behind it.
	let topics = $derived(collectBlogTags(entries.items, { limit: 8 }));
</script>

<BlogMasthead
	title="The Munchwerk blog"
	description="What guests post about restaurants, bars and cafés on TikTok, Instagram and Google, and what to do about it.">
	{#if topics.length}
		<BlogTagNav tags={topics} />
	{/if}
</BlogMasthead>

{#if featured}
	<BlogFeaturedHero entry={featured} />

	{#if rest.items.length > 0}
		<Section title="Latest articles" class="narrow gap-0 pb-12">
			<BlogEntryFeed initial={rest} {pageSize} />
		</Section>
	{/if}
{:else}
	<div class="narrow pb-12">
		<EmptyState icon={Newspaper} title="No articles yet" hint="The first ones are on their way." />
	</div>
{/if}

<BlogPitchBand />
