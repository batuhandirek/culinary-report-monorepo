<script lang="ts">
	import type { BlogEntrySummaryOutputDto } from 'client';

	import BlogCover from '#components/blog/blog-cover.svelte';
	import { blogTagLabel } from '#lib/blog.js';

	// From the blog: the newest articles, for the owners the blog is written for, right before
	// the venues' pitch.
	let { posts }: { posts: BlogEntrySummaryOutputDto[] } = $props();

	const published = (iso: string | null | undefined) =>
		iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
</script>

{#if posts.length}
	<section id="blog" aria-labelledby="blog-title" class="scroll-mt-4 pb-[72px] md:pb-28">
		<div class="lp-wrap flex flex-col gap-12">
			<div class="lp-rule-top flex flex-wrap items-end justify-between gap-x-12 gap-y-6 pt-10">
				<h2 id="blog-title" class="lp-display lp-h2 min-w-0 flex-[1_1_520px]">From the blog.</h2>
				<div class="flex max-w-[460px] flex-[1_1_320px] flex-col items-start gap-4">
					<p class="lp-lede lp-muted">What guests post about restaurants, bars and cafés, and what to do about it.</p>
					<a href="/blog" class="font-display border-b-[3px] text-lg font-extrabold no-underline" style="color: var(--lp-ink); border-color: var(--lp-rule)">All articles →</a>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
				{#each posts as post (post.id)}
					{@const topic = post.tags?.[0]?.name}
					<a href="/blog/{post.slug}" class="lp-post">
						<div class="lp-post__cover">
							<!-- The headline under it names the post; an alt here would read it twice -->
							<BlogCover image={post.coverImage} alt="" sizes="(min-width: 860px) 420px, 100vw" class="w-full" iconSize={32} />
						</div>
						<div class="flex flex-col gap-2.5 pt-2">
							{#if topic}<span class="lp-stamp-line" style="color: var(--lp-text-purple)">{blogTagLabel(topic)}</span>{/if}
							<h3 class="lp-post__title lp-display text-[clamp(26px,2.4vw,34px)]" style="letter-spacing: -0.03em; line-height: 0.95">{post.title}</h3>
							{#if post.excerpt}<p class="lp-muted m-0 line-clamp-3 text-base leading-[1.45] font-medium">{post.excerpt}</p>{/if}
							{#if post.publishedAt}<span class="lp-muted text-sm font-semibold">{published(post.publishedAt)}</span>{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
{/if}
