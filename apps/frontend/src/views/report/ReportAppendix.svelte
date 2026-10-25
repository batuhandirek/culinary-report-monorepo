<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import type { AdminReportOutputDto } from 'client';

	import Stars from './Stars.svelte';

	import { authorLabel, compact, monthLabel, PLATFORM_LABELS, TOPIC_LABELS, viewsLabel } from '#lib/culinary.js';
	import { Button } from '#ui/primitives-new/button/index.js';

	// Every post and review the report counts, so a claim can be checked against its sources.
	// Collapsed on screen behind one control; print always shows it, after the footer.
	interface Props {
		data: AdminReportOutputDto['data'];
	}

	let { data }: Props = $props();
	let open = $state(false);

	const reviews = $derived(data.reviews.list ?? []);
	const hasTripadvisor = $derived(reviews.some((r) => r.platform === 'tripadvisor'));
	const drafted = $derived(new Set((data.reviews.replyDrafts ?? []).map((d) => d.reviewId)));
	const posts = $derived([
		...data.posts.map((p) => ({ ...p, own: false })),
		...data.ownPosts.map((p) => ({ ...p, own: true }))
	]);

	const day = (iso: string) =>
		new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
	const topics = (list: string[]) => list.map((t) => TOPIC_LABELS[t] ?? t).join(', ');
	// Each place's Google page: the reviews are listed there too
	const googlePages = $derived(
		data.branches.flatMap((b) =>
			b.googleUrl
				? [{ url: b.googleUrl, label: data.branches.length > 1 ? (b.street ?? b.name) : 'Your Google page' }]
				: []
		)
	);
</script>

{#snippet flag(text: string)}
	<span
		class="border-line text-muted-foreground rounded-full border px-1.5 py-px text-[10px] font-medium whitespace-nowrap">
		{text}
	</span>
{/snippet}

<section class="break-before-page">
	<header class="border-ink flex items-end gap-3 border-b-2 pb-2.5 break-after-avoid">
		<span
			class="bg-acid border-ink text-ink number-hero grid h-11 min-w-11 shrink-0 place-items-center rounded-[6px] border-2 px-1.5 text-[24px]">
			A
		</span>
		<div class="min-w-0 flex-1">
			<p class="stamp text-beet m-0">Appendix</p>
			<h2 class="type-display m-0 mt-1 text-[26px]">Sources</h2>
		</div>
		<p class="text-muted-foreground m-0 hidden text-xs sm:block print:hidden">
			{posts.length}
			{posts.length === 1 ? 'post' : 'posts'} · {reviews.length}
			{reviews.length === 1 ? 'review' : 'reviews'}
		</p>
	</header>

	<div class="mt-4 print:hidden">
		<Button variant="outline" aria-expanded={open} onclick={() => (open = !open)}>
			{open ? 'Hide the sources' : 'Show every post and review'}
			<ChevronDownIcon class={['transition-transform', open && 'rotate-180']} />
		</Button>
	</div>

	<div class={[open ? 'block' : 'hidden', 'mt-6 print:mt-5 print:block']}>
		<div
			class="bg-tint text-reading-ink rounded-md px-5 py-4 text-[12px] leading-relaxed break-inside-avoid">
			<p class="m-0 mb-1.5 text-[13px] font-semibold text-ink">How we count</p>
			<ul class="m-0 flex list-disc flex-col gap-1 pl-4">
				<li>
					Posts are the TikTok and Instagram posts our searches found for {monthLabel(
						data.month
					)}; there can be more we did not see.
				</li>
				<li>
					A topic counts the posts or reviews that raised it, once each, however many
					points one review makes about it.
				</li>
				<li>
					Posts from your own account are listed here but never counted as word of mouth.
				</li>
				<li>
					Reviews are every Google{hasTripadvisor ? ' and TripAdvisor' : ''} review published in
					{monthLabel(data.month)}, as the platform showed them when we collected them.{#each googlePages as page (page.url)}
						<a
							class="text-beet ml-1"
							href={page.url}
							target="_blank"
							rel="noreferrer">{page.label}</a
						>{/each}
				</li>
			</ul>
		</div>

		<h3 class="m-0 mt-8 mb-2 text-base font-semibold">
			Posts <span class="text-muted-foreground text-sm font-normal">{posts.length}</span>
		</h3>
		{#if posts.length}
			<table class="w-full border-collapse text-[11.5px] leading-snug">
				<thead class="text-muted-foreground text-[10.5px]">
					<tr class="border-ink border-b">
						<th class="w-14 py-1.5 pr-2 text-left font-medium">Date</th>
						<th class="w-32 py-1.5 pr-2 text-left font-medium">Creator</th>
						<th class="w-12 py-1.5 pr-3 text-right font-medium">Views</th>
						<th class="py-1.5 text-left font-medium">Post</th>
					</tr>
				</thead>
				<tbody>
					{#each posts as post (post.postId)}
						<tr class="border-line border-b align-top break-inside-avoid">
							<td class="py-1.5 pr-2 whitespace-nowrap tabular-nums"
								>{day(post.postedAt)}</td>
							<td class="py-1.5 pr-2">
								<span class="block max-w-32 truncate font-medium"
									>{authorLabel(post.platform, post.author)}</span>
								<span class="text-muted-foreground block text-[10.5px]">
									{PLATFORM_LABELS[post.platform]}{post.authorFans
										? ` · ${compact(post.authorFans)}`
										: ''}
								</span>
							</td>
							<td class="py-1.5 pr-3 text-right tabular-nums"
								>{viewsLabel(post.platform, post.views)}</td>
							<td class="py-1.5">
								<span class="text-reading-ink">{post.summary}</span>
								<span class="mt-1 flex flex-wrap items-center gap-1">
									{#if post.own}{@render flag('your account')}{/if}
									{#if post.promotional}{@render flag('paid or gifted')}{/if}
									{#if !post.visited}{@render flag('did not visit')}{/if}
									<a
										class="text-beet text-[10.5px] break-all"
										href={post.url}
										target="_blank"
										rel="noreferrer"
										>{post.url
											.replace(/^https?:\/\/(www\.)?/, '')
											.slice(0, 60)}</a>
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">No posts this month.</p>
		{/if}

		<h3 class="m-0 mt-8 mb-2 text-base font-semibold">
			{hasTripadvisor ? 'Reviews' : 'Google reviews'} <span class="text-muted-foreground text-sm font-normal"
				>{reviews.length}</span>
		</h3>
		{#if reviews.length}
			<table class="w-full border-collapse text-[11.5px] leading-snug">
				<thead class="text-muted-foreground text-[10.5px]">
					<tr class="border-ink border-b">
						<th class="w-14 py-1.5 pr-2 text-left font-medium">Date</th>
						<th class="w-16 py-1.5 pr-2 text-left font-medium">Stars</th>
						<th class="py-1.5 pr-2 text-left font-medium">Review</th>
						<th class="w-20 py-1.5 text-left font-medium">Answered</th>
					</tr>
				</thead>
				<tbody>
					{#each reviews as review (review.reviewId)}
						<tr class="border-line border-b align-top break-inside-avoid">
							<td class="py-1.5 pr-2 whitespace-nowrap tabular-nums"
								>{day(review.publishedAt)}</td>
							<td class="py-1.5 pr-2">
								{#if review.stars}<Stars
										value={review.stars}
										size={9} />{:else}—{/if}
							</td>
							<td class="py-1.5 pr-2">
								{#if review.platform === 'tripadvisor'}
									<span class="eyebrow text-beet mr-1">TripAdvisor</span>
								{/if}
								{#if review.excerpt}
									<span class="text-reading-ink">{review.excerpt}</span>
								{:else}
									<span class="text-muted-foreground">Stars only</span>
								{/if}
								{#if review.praise.length || review.complaints.length}
									<span class="text-muted-foreground mt-0.5 block text-[10.5px]">
										{#if review.praise.length}Praised: {topics(
												review.praise
											)}{/if}{#if review.praise.length && review.complaints.length}
											·
										{/if}{#if review.complaints.length}Criticised: {topics(
												review.complaints
											)}{/if}
									</span>
								{/if}
							</td>
							<td class="py-1.5">
								{#if review.replied}
									Yes
								{:else if drafted.has(review.reviewId)}
									<span class="text-beet font-medium">Reply drafted</span>
								{:else}
									<span class="text-muted-foreground">No</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">No Google reviews this month.</p>
		{/if}
	</div>
</section>
