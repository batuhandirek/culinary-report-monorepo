<script lang="ts">
	import { ExternalLink, Pencil } from '@lucide/svelte';
	import type { AdminDigestedPostOutputDto, AdminMentionOutputDto, AdminSocialPostOutputDto } from 'client';

	import PostCommentsPanel from './components/PostCommentsPanel.svelte';

	import { invalidateAll } from '$app/navigation';
	import { at, onDay } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import DigestedPostView from '#components/admin/digestion/DigestedPostView.svelte';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { compact, PLATFORM_LABELS } from '#lib/culinary.js';
	import { findHref, findLabel } from '#lib/post-sources.js';
	import { topicHref } from '#lib/topic-format.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	let { data } = $props();
	let post: AdminSocialPostOutputDto = $derived(data.post);
	// What the pipeline made of it, drawn as the Digestion page draws an opened row
	let digested: AdminDigestedPostOutputDto = $derived(data.digested);

	// The mention whose venue is being corrected
	let editing = $state<AdminMentionOutputDto | null>(null);
	let editOpen = $state(false);

	// How long after the post a read was: counts are compared at seven days
	const afterPosting = (date: Date | string) => {
		const days = Math.floor((new Date(date).getTime() - new Date(post.postedAt).getTime()) / 86_400_000);
		return days < 1 ? 'the day it was posted' : `${days} day${days === 1 ? '' : 's'} after posting`;
	};
	const countsNote = $derived(
		!post.countsAt
			? undefined
			: post.countsFinalAt && new Date(post.countsFinalAt) > new Date(post.countsAt)
				? `Last read ${afterPosting(post.countsAt)}; gone (deleted or private) by ${onDay(post.countsFinalAt)}`
				: post.countsFinalAt
					? `Read ${afterPosting(post.countsAt)}, kept`
					: `Read ${afterPosting(post.countsAt)}; read again at seven days`
	);
	const isKept = (snapshot: { at: Date | string }) =>
		!!post.countsFinalAt && new Date(snapshot.at).getTime() === new Date(post.countsFinalAt).getTime();

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
		{ label: 'Views', value: compact(post.views), hint: countsNote },
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
	<AdminPanel>
		<DigestedPostView post={digested} withPostLink={false}>
			{#snippet mentionAction(mention)}
				{@const editable = post.mentions.find((m) => m.id === mention.id)}
				{#if editable}
					<IconButton
						icon={Pencil}
						label={`Change the venue of ${mention.venueName}`}
						variant="ghost"
						onclick={() => {
							editing = editable;
							editOpen = true;
						}} />
				{/if}
			{/snippet}
			{#snippet mentionDetails(mention)}
				{@const stored = post.mentions.find((m) => m.id === mention.id)}
				{#if stored?.topics?.length}
					<p class="m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-xs">
						<span class="text-muted-foreground">Food</span>
						{#each stored.topics as link (link.topic.key)}
							<a
								class="text-beet underline-offset-2 hover:underline"
								href={topicHref(link.topic.key)}
								title={link.source === 'category' ? "From the venue's Google category: the post named no cuisine" : undefined}>
								{link.topic.label}
							</a>
						{/each}
					</p>
				{/if}
				{#if stored?.statements.some((s) => s.text) && (!stored.brand || post.account?.brand?.id === stored.brand.id)}
					<p class="text-muted-foreground m-0 text-xs">
						{stored.brand
							? "The brand's own post: theme pages leave these claims out."
							: 'Matched to no brand: theme pages leave these claims out until it is.'}
					</p>
				{/if}
			{/snippet}
		</DigestedPostView>
	</AdminPanel>

	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
		<div class="flex min-w-0 flex-col gap-5">
			<AdminPanel title="Post">
				<AdminFacts items={facts} />
			</AdminPanel>
			{#if post.snapshots.length > 1}
				<AdminPanel title="Counts over time" note="Every read; the one at seven days is kept">
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="text-muted-foreground text-left text-xs">
									<th class="py-1 font-medium">Read</th>
									<th class="px-2 py-1 text-right font-medium">Views</th>
									<th class="px-2 py-1 text-right font-medium">Likes</th>
									<th class="px-2 py-1 text-right font-medium">Comments</th>
									<th class="px-2 py-1 text-right font-medium">Shares</th>
								</tr>
							</thead>
							<tbody class="divide-line divide-y">
								{#each post.snapshots as snapshot (snapshot.id)}
									<tr>
										<td class="py-2 pr-2">
											<span class="block whitespace-nowrap">{onDay(snapshot.at)}</span>
											<span class="text-muted-foreground block text-xs">
												{afterPosting(snapshot.at)}{isKept(snapshot) ? ' · kept' : ''}
											</span>
										</td>
										<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.views)}</td>
										<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.likes)}</td>
										<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.comments)}</td>
										<td class="px-2 py-2 text-right tabular-nums">{compact(snapshot.shares)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</AdminPanel>
			{/if}
		</div>
		<div class="flex min-w-0 flex-col gap-5">
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
			{#if post.platform === 'tiktok'}
				<PostCommentsPanel postId={post.id} />
			{/if}
		</div>
	</div>

	<AdminRawJson value={post} />
</div>

{#if editing}
	<ChangeMentionVenueDialog mention={editing} bind:active={editOpen} onChanged={() => invalidateAll()} />
{/if}
