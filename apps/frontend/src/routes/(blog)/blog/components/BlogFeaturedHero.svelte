<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';

	import type { BlogEntrySummaryOutputDto } from 'client/src/Api';

	import BlogCover from '#components/blog/blog-cover.svelte';
	import BlogEntryMeta from '#components/blog/BlogEntryMeta.svelte';
	import { blogTagLabel } from '#lib/blog.js';
	import Buttonish from '#ui/wrapped/Buttonish.svelte';

	// The lead story of /blog: the newest post, large — cover, topic, headline, excerpt,
	// byline and "Read the article". The page's `h1` is the masthead above, so this is an `h2`.
	// The entry must be dropped from the feed below (see `/blog/+page.svelte`) so the same
	// cover never appears twice on one screen.
	let { entry }: { entry: BlogEntrySummaryOutputDto } = $props();

	let topic = $derived(entry.tags?.[0]?.name ?? '');
</script>

<section class="narrow pb-10 md:pb-14">
	<a
		href={`/blog/${entry.slug}`}
		class="group focus-visible:ring-ring grid grid-cols-1 items-center gap-5 rounded-md outline-none focus-visible:ring-2 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-10">
		<div class="relative">
			<span class="sticker">Featured</span>
			<!-- First thing on the page: loads at once, and the headline beside it is its name. -->
			<BlogCover
				image={entry.coverImage}
				alt=""
				eager
				sizes="(min-width: 1288px) 635px, (min-width: 768px) 50vw, 100vw"
				class="rounded-md"
				iconSize={44} />
		</div>
		<div class="flex min-w-0 flex-col items-start gap-3 md:gap-4">
			{#if topic}
				<span class="stamp text-beet">{blogTagLabel(topic)}</span>
			{/if}
			<h2
				class="type-display text-ink m-0 text-3xl text-balance group-hover:underline md:text-5xl">
				{entry.title}
			</h2>
			{#if entry.excerpt}
				<p
					class="text-muted-foreground m-0 line-clamp-3 max-w-[60ch] text-[0.9375rem] leading-relaxed">
					{entry.excerpt}
				</p>
			{/if}
			<BlogEntryMeta {entry} class="text-sm" />
			<!-- `Buttonish`, not `Button`: it renders a `div` with the same `buttonVariants`
			     treatment, and the whole hero is already one link — a nested `<a>` would be
			     invalid. -->
			<Buttonish size="lg" variant="secondary" suffixIcon={ArrowRight} class="mt-1">
				Read the article
			</Buttonish>
		</div>
	</a>
</section>
