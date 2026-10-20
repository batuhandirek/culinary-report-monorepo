<script lang="ts">
	import { ExternalLink, Pencil } from '@lucide/svelte';
	import type { AdminMentionOutputDto, AdminSocialPostOutputDto } from 'client';

	import PostCommentsPanel from './components/PostCommentsPanel.svelte';

	import { invalidateAll } from '$app/navigation';
	import { at } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { compact, PLATFORM_LABELS, sentimentVariant, TOPIC_LABELS } from '#lib/culinary.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	let { data } = $props();
	let post: AdminSocialPostOutputDto = $derived(data.post);

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
		{ label: 'Creator', value: post.author ? `@${post.author}` : null, hint: post.authorFans ? `${compact(post.authorFans)} followers` : undefined },
		{ label: 'Views', value: compact(post.views) },
		{ label: 'Likes, comments, saves', value: `${compact(post.likes)} · ${compact(post.comments)} · ${compact(post.saves)}` },
		{ label: 'Tagged place', value: post.locationName },
		{ label: 'Found by', value: post.source },
		{ label: 'Hashtags', value: post.hashtags?.map((h) => `#${h}`).join(' ') },
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
				<p class="m-0 whitespace-pre-line text-sm">{post.text || '—'}</p>
			</AdminPanel>
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
							{#if mention.praise.length || mention.complaints.length}
								<p class="text-muted-foreground m-0 text-xs">
									{#each mention.praise as point, i (i)}
										<span class="text-success">+ {TOPIC_LABELS[point.topic] ?? point.topic}: {point.detail}</span><br />
									{/each}
									{#each mention.complaints as point, i (i)}
										<span class="text-destructive">− {TOPIC_LABELS[point.topic] ?? point.topic}: {point.detail}</span><br />
									{/each}
								</p>
							{/if}
							{#if mention.dishes.length}
								<p class="text-muted-foreground m-0 text-xs">
									Dishes: {mention.dishes.map((d) => d.name).join(', ')}
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
