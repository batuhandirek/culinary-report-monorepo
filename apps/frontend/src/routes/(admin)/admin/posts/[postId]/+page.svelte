<script lang="ts">
	import { ExternalLink, Pencil } from '@lucide/svelte';
	import type { AdminMentionOutputDto, AdminSocialPostOutputDto } from 'client';

	import PostCommentsPanel from './components/PostCommentsPanel.svelte';

	import { invalidateAll } from '$app/navigation';
	import { at, onDay } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import FeedbackNotes from '#components/admin/feedback/FeedbackNotes.svelte';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { captionParts } from '#lib/caption-links.js';
	import { compact, PLATFORM_LABELS, sentimentVariant } from '#lib/culinary.js';
	import { findHref, findLabel } from '#lib/post-sources.js';
	import { topicHref } from '#lib/topic-format.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	let { data } = $props();
	let post: AdminSocialPostOutputDto = $derived(data.post);
	// The month a note's theme link opens the theme's page on
	const postMonth = $derived(new Date(post.postedAt).toISOString().slice(0, 7));

	// The mention whose venue is being corrected
	let editing = $state<AdminMentionOutputDto | null>(null);
	let editOpen = $state(false);

	const matchLabel = (mention: AdminMentionOutputDto) =>
		mention.matchMethod === 'other_city'
			? `not in ${post.city.name} (${mention.city ?? 'elsewhere'})`
			: mention.matchMethod === 'ignored'
				? 'not a venue (by an admin)'
				: mention.matchMethod === 'manual'
					? mention.brand
						? 'linked by an admin'
						: 'unlinked by an admin'
					: mention.brand
						? mention.venue
							? `matched: ${mention.matchMethod}`
							: `matched: ${mention.matchMethod}, the brand (no branch named)`
						: 'no venue matched';

	const facts = $derived<AdminFact[]>([
		{ label: 'Posted', value: at(post.postedAt) },
		{
			label: 'Creator',
			value: post.author ? `@${post.author}` : null,
			href: post.account ? `/admin/creators/${post.account.creator.id}` : undefined,
			hint: post.authorFans ? `${compact(post.authorFans)} followers` : undefined
		},
		...(post.account?.brand
			? [{ label: 'Own account of', value: post.account.brand.name, href: `/admin/brands/${post.account.brand.id}` }]
			: []),
		{ label: 'City', value: post.city.name, href: `/admin/cities/${post.city.id}` },
		{ label: 'Views', value: compact(post.views) },
		{ label: 'Likes, comments, saves', value: `${compact(post.likes)} · ${compact(post.comments)} · ${compact(post.saves)}` },
		{ label: 'Tagged place', value: post.locationName },
		{ label: 'Analysed', value: post.analysedAt ? at(post.analysedAt) : null, hint: post.analysisTokens ? `${post.analysisTokens} tokens` : undefined }
	]);
</script>

<AdminPageHeader title={post.author ? `@${post.author}` : 'Post'}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">{PLATFORM_LABELS[post.platform]} post · {at(post.postedAt)}</span>
	{/snippet}
	{#snippet belowTitle()}
		<div class="mt-1.5 flex flex-wrap items-center gap-2">
			{#if post.isAd || post.isPromotional}
				<Badge pill variant="warning">Promotional</Badge>
			{/if}
			<Badge pill variant="secondary">{compact(post.views)} views</Badge>
		</div>
	{/snippet}
	{#snippet rightTitle()}
		<Button size="sm" variant="outline" icon={ExternalLink} href={post.url} newTab>
			Open on {PLATFORM_LABELS[post.platform]}
		</Button>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
		<div class="flex min-w-0 flex-col gap-5">
			<AdminPanel title="Caption">
				<p class="m-0 whitespace-pre-line break-words text-sm">
					{#if post.text}{#each captionParts(post.text, post.platform) as part, i (i)}{#if part.href}<a
								class="text-beet underline-offset-2 hover:underline"
								href={part.href}
								target={part.external ? '_blank' : undefined}
								rel={part.external ? 'noopener noreferrer' : undefined}>{part.text}</a>{:else}{part.text}{/if}{/each}{:else}—{/if}
				</p>
			</AdminPanel>
			{#if post.hashtagLinks.length}
				<AdminPanel title="Hashtags" note="A tag opens the posts that carry it">
					<ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-sm">
						{#each post.hashtagLinks as { hashtag } (hashtag.id)}
							<li>
								<a class="underline-offset-2 hover:underline" href={`/admin/posts?hashtag=${encodeURIComponent(hashtag.tag)}`}>#{hashtag.tag}</a>{#if hashtag.foodTopic}
									<span class="text-muted-foreground"> → </span><a class="text-beet underline-offset-2 hover:underline" href={`/admin/trends/${encodeURIComponent(hashtag.foodTopic.key)}`}>{hashtag.foodTopic.label}</a>
								{:else if hashtag.brand}
									<span class="text-muted-foreground"> → </span><a class="text-beet underline-offset-2 hover:underline" href={`/admin/brands/${hashtag.brand.id}`}>{hashtag.brand.name}</a>
								{/if}
							</li>
						{/each}
					</ul>
				</AdminPanel>
			{/if}
			{#if post.foundBy.length}
				<AdminPanel title="Found by" note={post.foundBy.length > 1 ? `${post.foundBy.length} sources` : undefined}>
					<ul class="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
						{#each post.foundBy as find (`${find.kind} ${find.value}`)}
							{@const href = findHref(find, post.city.id)}
							<li class="flex flex-wrap items-baseline justify-between gap-x-3">
								{#if href}
									<a class="underline-offset-2 hover:underline" {href}>{findLabel(find)}</a>
								{:else}
									<span title="No longer one of the city's sources">{findLabel(find)}</span>
								{/if}
								<span class="text-muted-foreground text-xs">{onDay(find.foundAt)}</span>
							</li>
						{/each}
					</ul>
				</AdminPanel>
			{/if}
			{#if post.subtitles}
				<AdminPanel title="Transcript" note={post.subtitlesLanguage}>
					<p class="text-muted-foreground m-0 max-h-80 overflow-y-auto whitespace-pre-line text-sm">
						{post.subtitles}
					</p>
				</AdminPanel>
			{/if}
			<AdminPanel title="Post">
				<AdminFacts items={facts} />
			</AdminPanel>
		</div>

		<AdminPanel title="Brands mentioned" note={post.mentions.length}>
			{#if post.mentions.length}
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
					{#each post.mentions as mention (mention.id)}
						<li class="flex flex-col gap-1.5 py-3 text-sm">
							<div class="flex flex-wrap items-center gap-2">
								{#if mention.brand}
									<a href={`/admin/brands/${mention.brand.id}`} class="font-semibold hover:underline">
										{mention.brand.name}
									</a>
									{#if mention.venue && mention.venue.name !== mention.brand.name}
										<a href={`/admin/venues/${mention.venue.id}`} class="text-muted-foreground text-xs hover:underline">
											{mention.venue.name}
										</a>
									{/if}
								{:else if mention.venue}
									<a href={`/admin/venues/${mention.venue.id}`} class="font-semibold hover:underline">
										{mention.venue.name}
									</a>
								{:else}
									<span class="font-semibold">{mention.venueName}</span>
								{/if}
								<Badge variant={sentimentVariant(mention.sentiment)}>{mention.sentiment}</Badge>
								<span class="text-muted-foreground text-xs" title={mention.matchNote}>
									{matchLabel(mention)}
								</span>
								<IconButton
									icon={Pencil}
									label={`Change the venue of ${mention.venueName}`}
									variant="ghost"
									class="ml-auto"
									onclick={() => {
										editing = mention;
										editOpen = true;
									}} />
							</div>
							<p class="m-0">{mention.summary}</p>
							<FeedbackNotes feedback={mention.feedback} cityId={post.city.id} month={postMonth} />
							{#if mention.feedback?.some((row) => row.detail) && (!mention.brand || post.account?.brand?.id === mention.brand.id)}
								<p class="text-muted-foreground m-0 text-xs">
									{mention.brand
										? "The brand's own post: theme pages leave these notes out."
										: 'Matched to no brand: theme pages leave these notes out until it is.'}
								</p>
							{/if}
							{#if mention.foodTopics?.length}
								<p class="m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-xs">
									<span class="text-muted-foreground">Food</span>
									{#each mention.foodTopics as link (link.topic.key)}
										<a
											class="text-beet underline-offset-2 hover:underline"
											href={topicHref(link.topic.key)}
											title={link.source === 'category' ? "From the venue's Google category: the post named no cuisine" : undefined}>
											{link.topic.label}
										</a>
									{/each}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground m-0 text-sm">
					{post.analysedAt ? 'No venue named in this post.' : 'Not analysed yet.'}
				</p>
			{/if}
		</AdminPanel>

		{#if post.platform === 'tiktok'}
			<PostCommentsPanel postId={post.id} />
		{/if}
	</div>

	<AdminRawJson value={post} />
</div>

{#if editing}
	<ChangeMentionVenueDialog mention={editing} bind:active={editOpen} onChanged={() => invalidateAll()} />
{/if}
