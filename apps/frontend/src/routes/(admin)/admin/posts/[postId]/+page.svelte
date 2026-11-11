<script lang="ts">
	import { FileText, Globe, Pencil, Store } from '@lucide/svelte';
	import type { AdminDigestedPostOutputDto, AdminDigestionMentionOutputDto, AdminDigestionStatementOutputDto, AdminMentionOutputDto, AdminSocialPostOutputDto } from 'client';
	import type { Component } from 'svelte';

	import ClaimsCard from './components/ClaimsCard.svelte';
	import PostCommentsPanel from './components/PostCommentsPanel.svelte';
	import PostCountsPanel from './components/PostCountsPanel.svelte';
	import PostFacts from './components/PostFacts.svelte';
	import PostHeader from './components/PostHeader.svelte';
	import PostTags from './components/PostTags.svelte';
	import PostTextCard from './components/PostTextCard.svelte';

	import { afterNavigate, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { postSteps } from '#components/admin/digestion/post-steps.js';
	import RawRecordDialog from '#components/admin/RawRecordDialog.svelte';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { SKIP_REASON_LABELS } from '#lib/culinary.js';
	import { MATCH_METHOD_LABELS, matchMethodVariant } from '#lib/digestion.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	// One post and what the pipeline made of it: the author, what it is and where it stands, then its
	// figures and how far each step got in one strip; on the left what was scraped (the caption, the
	// transcript or the article, the claims' quotes marked), on the right what it says, a card per
	// place agent A named (what matching made of it, a match or a correction at hand; the kinds of
	// food it is about are its claims' food wordings) and one each for its claims about the city and in general. Counts over time and the
	// comments under it. A claims table's link names a claim by the hash (`#claim-<id>`): the page
	// lands on it and marks it.
	let { data } = $props();
	let post: AdminSocialPostOutputDto = $derived(data.post);
	// What the pipeline made of it: every claim with its quote and whether the labeller read it
	let digested: AdminDigestedPostOutputDto = $derived(data.digested);

	const isBlog = $derived(post.platform === 'blog');
	const month = $derived(new Date(post.postedAt).toISOString().slice(0, 7));
	const texts = $derived([digested.text, digested.subtitles]);
	const quotes = $derived(digested.statements.map((s) => s.quote));
	const steps = $derived(postSteps(digested));
	const selected = $derived(Number(page.url.hash.match(/^#claim-(\d+)$/)?.[1]) || undefined);
	// The page renders after the browser looked for the hash on a fresh load: land on the claim here
	afterNavigate(() => {
		if (selected) document.getElementById(`claim-${selected}`)?.scrollIntoView({ block: 'center' });
	});

	// A place still waiting for a brand: not matched, or not tried yet (another city, "not a venue"
	// and an admin's unlink are settled)
	const needsMatch = (m: AdminDigestionMentionOutputDto) => !m.brand && (!m.matchMethod || m.matchMethod === 'none');
	const unmatched = $derived(digested.mentions.filter(needsMatch).length);
	// The stored mention: the row the venue dialog edits
	const storedOf = (id: number) => post.mentions.find((m) => m.id === id);

	const aboutPlace = (mentionId: number) => digested.statements.filter((s) => s.subject === 'place' && s.mention?.id === mentionId);
	const mentionIds = $derived(new Set(digested.mentions.map((m) => m.id)));
	const OTHER_GROUPS = $derived(
		(
			[
				{ key: 'place', icon: Store, label: 'A place', statements: digested.statements.filter((s) => s.subject === 'place' && !(s.mention && mentionIds.has(s.mention.id))) },
				{ key: 'city', icon: Globe, label: `About ${post.city.name}`, statements: digested.statements.filter((s) => s.subject === 'city') },
				{ key: 'none', icon: FileText, label: 'In general', statements: digested.statements.filter((s) => s.subject === 'none') }
			] as { key: string; icon: Component; label: string; statements: AdminDigestionStatementOutputDto[] }[]
		).filter((g) => g.statements.length)
	);

	// How a place's claims count, said under its head
	const countNote = (mention: AdminDigestionMentionOutputDto) =>
		mention.brand && post.account?.brand?.id === mention.brand.id
			? "The brand's own post: theme pages leave these claims out."
			: needsMatch(mention)
				? 'Theme pages leave these claims out until it is matched.'
				: undefined;

	// The mention whose venue is being set or corrected
	let editing = $state<AdminMentionOutputDto | null>(null);
	let editOpen = $state(false);
	const edit = (id: number) => {
		editing = storedOf(id) ?? null;
		editOpen = !!editing;
	};
	let rawOpen = $state(false);
</script>

<PostHeader {post} {unmatched} places={digested.mentions.length} onRaw={() => (rawOpen = true)} />

<div class="flex min-w-0 flex-col gap-3 pb-12">
	<PostFacts {post} {steps} />

	<div class="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
		<!-- What was scraped -->
		<div class="flex min-w-0 flex-col gap-3">
			<PostTextCard
				label={isBlog ? 'Article' : 'Caption'}
				text={digested.text}
				{quotes}
				platform={post.platform}
				aside={!isBlog && !digested.subtitles ? 'Transcript: none' : undefined}
				footer={digested.taggedHandles?.length || digested.hashtagLinks.some((l) => !l.hashtag.ignored) ? tags : undefined} />
			{#if !isBlog && digested.subtitles}
				<PostTextCard label="Transcript" text={digested.subtitles} {quotes} note={digested.subtitlesLanguage} />
			{/if}
		</div>

		<!-- What it says, place by place -->
		<div class="flex min-w-0 flex-col gap-3">
			{#if post.skipReason}
				<p class="bg-paper border-line text-muted-foreground m-0 rounded-md border px-3.5 py-3 text-sm">
					Skipped by the gate: {SKIP_REASON_LABELS[post.skipReason] ?? post.skipReason}. No places or claims taken from it.
				</p>
			{:else if !post.analysedAt}
				<p class="bg-paper border-line text-muted-foreground m-0 rounded-md border px-3.5 py-3 text-sm">Not read by agent A yet.</p>
			{:else if !digested.mentions.length && !digested.statements.length}
				<p class="bg-paper border-line text-muted-foreground m-0 rounded-md border px-3.5 py-3 text-sm">Agent A found no food or drink place and no claim in it.</p>
			{/if}

			{#each digested.mentions as mention (mention.id)}
				<ClaimsCard statements={aboutPlace(mention.id)} place={mention.venueName} {texts} cityId={post.city.id} {month} {selected} note={countNote(mention)}>
					{#snippet head()}
						{@render placeHead(mention)}
					{/snippet}
					{#snippet actions()}
						{#if storedOf(mention.id)}
							{#if needsMatch(mention)}
								<Button size="xs" onclick={() => edit(mention.id)}>Match to a brand</Button>
							{/if}
							<IconButton icon={Pencil} sm variant="ghost" label={`Change the venue of ${mention.venueName}`} onclick={() => edit(mention.id)} />
						{/if}
					{/snippet}
				</ClaimsCard>
			{/each}

			{#each OTHER_GROUPS as group (group.key)}
				<ClaimsCard statements={group.statements} {texts} cityId={post.city.id} {month} {selected}>
					{#snippet head()}
						<group.icon class="text-muted-foreground size-[15px] shrink-0" />
						<span>{group.label}</span>
					{/snippet}
				</ClaimsCard>
			{/each}
		</div>
	</div>

	{#if post.snapshots.length > 1 || post.platform === 'tiktok'}
		<div class="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
			{#if post.snapshots.length > 1}<PostCountsPanel {post} />{/if}
			{#if post.platform === 'tiktok'}<PostCommentsPanel postId={post.id} />{/if}
		</div>
	{/if}
</div>

{#snippet tags()}
	<PostTags platform={post.platform} taggedHandles={digested.taggedHandles} hashtagLinks={digested.hashtagLinks} />
{/snippet}

<!-- A place's head: its name as agent A gave it, what the post says of it, what matching made of it
     (the brand and branch, how) and its flags -->
{#snippet placeHead(mention: AdminDigestionMentionOutputDto)}
	{@const facts = [mention.locationHint, mention.city].filter(Boolean)}
	<Store class="text-muted-foreground size-[15px] shrink-0" />
	<span>{mention.venueName}</span>
	{#if facts.length}<span class="text-muted-foreground text-xs font-normal">{facts.join(' · ')}</span>{/if}
	{#if mention.brand}
		<span class="text-xs font-normal">
			→ <a class="font-semibold underline-offset-4 hover:underline" href={`/admin/brands/${mention.brand.id}`}>{mention.brand.name}</a>
			{#if mention.venue}
				<span class="text-faint">›</span>
				<a class="underline-offset-4 hover:underline" href={`/admin/venues/${mention.venue.id}`}>{mention.venue.name}{mention.venue.district ? ` (${mention.venue.district})` : ''}</a>
			{:else}
				<span class="text-muted-foreground">· no branch named</span>
			{/if}
		</span>
	{/if}
	<span class="font-normal" title={[mention.matchScore != null ? `score ${mention.matchScore.toFixed(2)}` : '', mention.matchNote ?? ''].filter(Boolean).join(' · ') || undefined}>
		<Badge pill variant={matchMethodVariant(mention.matchMethod)}>
			{mention.matchMethod ? (MATCH_METHOD_LABELS[mention.matchMethod] ?? mention.matchMethod) : 'not matched yet'}
		</Badge>
	</span>
	{#if !mention.visited}<Badge pill variant="quiet">not visited</Badge>{/if}
	{#if mention.isNewOpening}<Badge pill variant="warning">new opening</Badge>{/if}
	{#if mention.unconfirmedAt}
		<span title="A new read of the post no longer finds this place; the match stands until an admin decides"><Badge pill variant="warning">unconfirmed</Badge></span>
	{/if}
	{#if mention.matchNote}<span class="text-muted-foreground text-xs font-normal italic">{mention.matchNote}</span>{/if}
{/snippet}

<RawRecordDialog value={post} bind:active={rawOpen} />

{#if editing}
	<ChangeMentionVenueDialog mention={editing} bind:active={editOpen} onChanged={() => invalidateAll()} />
{/if}
