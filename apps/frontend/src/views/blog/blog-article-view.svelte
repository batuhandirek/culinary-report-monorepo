<script lang="ts">
	import { ChevronDown, ChevronRight, List } from '@lucide/svelte';

	import type { BlogEntryOutputDto } from 'client/src/Api';

	import { browser } from '$app/env';
	import { PUBLIC_APP_URL } from '$app/env/public';
	import BlogCover from '#components/blog/blog-cover.svelte';
	import BlogEntryMeta from '#components/blog/BlogEntryMeta.svelte';
	import ShareButton from '#components/ShareButton.svelte';
	import { api } from '#lib/api.js';
	import {
		blogTagLabel,
		buildBlogToc,
		localizeBlogLinks,
		readingTimeMinutes
	} from '#lib/blog.js';
	import Icon from '#ui/components/Icon.svelte';
	import Avatar from '#ui/wrapped/Avatar.svelte';

	// The article itself — headline, byline, cover, contents, body, topics — shared by the
	// public page and the admin draft preview so both look identical. What surrounds an
	// article on the site (next reads, the pitch for the report, structured data)
	// belongs to the public route, not here. `trackViews` is public-only: admin previews
	// and crawlers must not inflate the tally.
	let {
		entry,
		trackViews = false
	}: {
		entry: BlogEntryOutputDto;
		trackViews?: boolean;
	} = $props();

	// Content is server-rendered HTML from the TipTap document (admin-authored, trusted).
	// Links to our own site are made in-app links first (`localizeBlogLinks`); then
	// `buildBlogToc` both derives the Contents list and stamps the anchor ids onto the
	// h2s it lists, so the two can never disagree. Pure string work, so SSR and hydration
	// produce identical markup.
	let article = $derived(buildBlogToc(localizeBlogLinks(entry.contentHtml)));
	let html = $derived(article.html);
	// One heading is a section, not a table of contents — the list only earns its space
	// once there is somewhere to choose between.
	let toc = $derived(article.toc.length > 1 ? article.toc : []);

	let minutes = $derived(readingTimeMinutes(entry.contentHtml));

	// The lead tag is the article's topic: it sits above the headline as the second step of
	// the trail, and the full set closes the article.
	let leadTag = $derived(entry.tags?.[0]);

	// The canonical address, not `location.href`: identical on the server and the client,
	// and free of whatever tracking query the reader arrived with.
	let shareUrl = $derived(`${PUBLIC_APP_URL}/blog/${entry.slug}`);

	// Which section is being read: the last heading that has passed under the header.
	// Listening in the capture phase catches the scroll whichever ancestor does it — the
	// window on the public page, the admin's own pane in the preview.
	const READING_LINE = 140;
	let bodyEl = $state<HTMLElement>();
	let activeId = $state<string>();
	$effect(() => {
		if (!bodyEl || toc.length === 0) return;
		const headings = toc
			.map((item) => document.getElementById(item.id))
			.filter((el): el is HTMLElement => !!el && bodyEl!.contains(el));

		let frame = 0;
		const update = () => {
			frame = 0;
			let current: string | undefined;
			for (const heading of headings) {
				if (heading.getBoundingClientRect().top > READING_LINE) break;
				current = heading.id;
			}
			activeId = current;
		};
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		update();
		document.addEventListener('scroll', onScroll, { capture: true, passive: true });
		return () => {
			document.removeEventListener('scroll', onScroll, { capture: true });
			if (frame) cancelAnimationFrame(frame);
		};
	});

	// Explicit, client-only view count — keeps SSR fetches and crawlers out of the tally.
	let viewedId = $state<string | undefined>(undefined);
	$effect(() => {
		if (!trackViews || !browser || !entry?.id || viewedId === entry.id) return;
		viewedId = entry.id;
		api.blog.registerView(entry.id).catch(() => {});
	});
</script>

{#snippet share()}
	<ShareButton url={shareUrl} title={entry.title} class="w-auto shrink-0" />
{/snippet}

<!-- A container query, not a viewport one: the admin preview mounts this in a pane far
     narrower than the window, and the contents rail must follow the room it actually has. -->
<div class="@container">
	<div class="narrow">
		<div
			class={toc.length
				? 'grid grid-cols-1 gap-8 @4xl:grid-cols-[minmax(0,1fr)_17.5rem] @4xl:gap-12'
				: ''}>
			<article class={['pb-10', toc.length ? 'max-w-[820px]' : 'mx-auto max-w-[760px]']}>
				<header class="pt-4 md:pt-8">
					<!-- Where this sits: the blog, then the article's topic. Two short steps a
					     reader arriving from search can use to see what else is here. -->
					<nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-1.5">
						<a
							href="/blog"
							class="eyebrow text-beet hover:text-ink inline-flex min-h-11 items-center">
							Blog
						</a>
						{#if leadTag}
							<Icon icon={ChevronRight} size={12} class="text-beet shrink-0" />
							<a
								href={`/blog/tag/${leadTag.slug}`}
								class="eyebrow text-beet hover:text-ink inline-flex min-h-11 min-w-0 items-center">
								<span class="truncate">{blogTagLabel(leadTag.name)}</span>
							</a>
						{/if}
					</nav>

					<h1
						class="type-title text-ink m-0 text-3xl leading-tight text-balance sm:text-[2.625rem]">
						{entry.title}
					</h1>

					{#if entry.excerpt}
						<p
							class="text-muted-foreground mt-4 mb-0 max-w-[60ch] text-lg leading-relaxed">
							{entry.excerpt}
						</p>
					{/if}

					<div class="border-line mt-6 flex items-center gap-3 border-y py-3">
						{#if entry.author?.publicName}
							<Avatar
								src={entry.author.profileImage?.url}
								alt=""
								size={44}
								identifier={entry.author.id}
								class="shrink-0" />
						{/if}
						<div class="min-w-0 flex-1">
							{#if entry.author?.publicName}
								<div class="text-ink truncate text-sm font-semibold">
									{entry.author.publicName}
								</div>
							{/if}
							<BlogEntryMeta {entry} {minutes} author={false} class="text-sm" />
						</div>
						{@render share()}
					</div>
				</header>

				{#if entry.coverImage}
					<BlogCover
						image={entry.coverImage}
						alt={entry.title}
						eager
						sizes="(min-width: 900px) 820px, 100vw"
						class="mt-6 rounded-md"
						iconSize={52} />
				{/if}

				<!-- Contents, inline and folded — the rail is desktop-only, and on a phone the
				     contents are most useful right before the body starts, without pushing it
				     a screen down. -->
				{#if toc.length}
					<details class="group bg-paper border-line mt-6 rounded-md border @4xl:hidden">
						<summary
							class="text-ink flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
							<Icon icon={List} size={16} class="shrink-0" />
							Contents
							<span class="font-term text-muted-foreground text-base font-normal">
								{toc.length} sections
							</span>
							<Icon
								icon={ChevronDown}
								size={16}
								class="ml-auto shrink-0 transition-transform group-open:rotate-180" />
						</summary>
						<nav aria-label="Contents">
							<ol class="border-line m-0 list-none border-t p-0 py-1">
								{#each toc as item (item.id)}
									<li>
										<a
											href={`#${item.id}`}
											class="text-ink hover:bg-wash flex min-h-11 items-center px-4 py-2 text-sm leading-snug">
											{item.text}
										</a>
									</li>
								{/each}
							</ol>
						</nav>
					</details>
				{/if}

				<div bind:this={bodyEl} class="blog-content pt-8 pb-6">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html html}
				</div>

				<footer
					class="border-line flex flex-col items-start gap-4 border-t py-5 sm:flex-row sm:items-center">
					{#if entry.tags?.length}
						<ul
							aria-label="Topics"
							class="m-0 flex flex-1 list-none flex-wrap gap-2 p-0">
							{#each entry.tags as tag (tag.id)}
								<li>
									<a
										href={`/blog/tag/${tag.slug}`}
										class="chip border-line inline-flex min-h-11 items-center border">
										{blogTagLabel(tag.name)}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					<div class="sm:ml-auto">
						{@render share()}
					</div>
				</footer>
			</article>

			{#if toc.length}
				<aside class="hidden @4xl:block">
					<nav
						aria-label="Contents"
						class="no-scrollbar sticky top-24 mt-8 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-4">
						<div class="eyebrow text-muted-foreground mb-3">Contents</div>
						<ol class="border-line m-0 list-none border-l p-0">
							{#each toc as item (item.id)}
								<li>
									<a
										href={`#${item.id}`}
										aria-current={activeId === item.id ? 'location' : undefined}
										class="text-muted-foreground hover:text-ink aria-[current]:border-chili aria-[current]:text-ink -ml-px block border-l-2 border-transparent py-2 pl-4 text-sm leading-snug aria-[current]:font-semibold">
										{item.text}
									</a>
								</li>
							{/each}
						</ol>
					</nav>
				</aside>
			{/if}
		</div>
	</div>
</div>
