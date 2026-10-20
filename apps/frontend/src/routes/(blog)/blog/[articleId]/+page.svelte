<script lang="ts">
	import type { BlogEntryOutputDto, BlogEntrySummaryOutputDto } from 'client/src/Api';

	import BlogPitchBand from '../../components/BlogPitchBand.svelte';

	import ArticleNextReads from './components/ArticleNextReads.svelte';

	import { page } from '$app/state';
	import SafeJsonLd from '#components/SafeJsonLd.svelte';
	import { blogPostingJsonLd } from '#lib/blog.js';
	import BlogArticleView from '#views/blog/blog-article-view.svelte';

	let entry = $derived(page.data.entry as BlogEntryOutputDto);
	let next = $derived(page.data.next as BlogEntrySummaryOutputDto[]);
</script>

<!-- The headline and excerpt are written by an editor: `SafeJsonLd`, never `JsonLd`. -->
<SafeJsonLd schema={blogPostingJsonLd(entry)} />

<BlogArticleView {entry} trackViews />
<ArticleNextReads entries={next} />
<BlogPitchBand />
