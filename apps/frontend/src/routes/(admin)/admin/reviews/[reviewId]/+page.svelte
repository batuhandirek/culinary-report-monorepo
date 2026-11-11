<script lang="ts">
	import { Star } from '@lucide/svelte';
	import type { AdminReviewDetailOutputDto } from 'client';

	import ReviewClaims from './components/ReviewClaims.svelte';

	import { page } from '$app/state';
	import { at, onDay } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import type { Statement } from '#lib/statements.js';
	import Badge from '#ui/wrapped/Badge.svelte';

	// One review, as a post has its page: what the reviewer wrote (in English when it was
	// translated, the original under it; a long one folded to eight lines), the owner's reply, and
	// every claim agent A took from it, each tinted by its sentiment. A link from a claims table
	// names its claim by the hash (`#claim-<id>`): the browser lands on it and it is outlined. The
	// facts beside: when, how many stars, the branch, brand and city. Google's text comes with `<br>`
	// tags and markdown marks; they are read as line breaks and dropped.
	let { data } = $props();
	const review: AdminReviewDetailOutputDto = $derived(data.review);
	const selected = $derived(Number(page.url.hash.match(/^#claim-(\d+)$/)?.[1]) || undefined);
	const month = $derived(new Date(review.publishedAt).toISOString().slice(0, 7));
	const platform = $derived(review.platform === 'tripadvisor' ? 'TripAdvisor' : 'Google');
	const translated = $derived(!!review.textTranslated && review.textTranslated !== review.text);
	/** Google's `<br>` as line breaks, its markdown marks (`**`, a heading's `#`) dropped */
	const plain = (text: string) =>
		text
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/\*\*/g, '')
			.replace(/^#+\s*/gm, '')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
	const shown = $derived(plain(review.textTranslated ?? review.text ?? ''));
	const original = $derived(translated && review.text ? plain(review.text) : '');
	const long = $derived(shown.length > 900);
	let expanded = $state(false);
	const needsReply = $derived(
		!!(review.stars && review.stars <= 3 && (review.text || review.textTranslated) && !review.ownerResponse && !review.markedRepliedAt)
	);
	const statements = $derived(review.statements as unknown as Statement[]);
	const claimCount = $derived(statements.filter((s) => s.text).length);

	const facts = $derived<AdminFact[]>([
		{ label: 'Published', value: at(review.publishedAt) },
		{
			label: 'Branch',
			value: review.branch.street ? `${review.branch.name}, ${review.branch.street}` : review.branch.name,
			href: `/admin/venues/${review.branch.id}?tab=reviews`
		},
		{ label: 'Brand', value: review.brand.name, href: `/admin/brands/${review.brand.id}?tab=reviews` },
		{ label: 'City', value: review.city.name, href: `/admin/cities/${review.city.id}` },
		{ label: 'On', value: platform },
		{ label: 'Likes', value: review.likes ? String(review.likes) : null },
		{ label: 'Language', value: review.language ?? null },
		{
			label: 'Answered',
			value: review.ownerResponseAt
				? `Owner replied ${onDay(review.ownerResponseAt)}`
				: review.ownerResponse
					? 'Owner replied'
					: review.markedRepliedAt
						? `Marked answered ${onDay(review.markedRepliedAt)}`
						: null
		},
		{ label: 'Analysed', value: review.analysedAt ? at(review.analysedAt) : null }
	]);
</script>

<AdminPageHeader title={review.branch.name}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">{platform} review · {onDay(review.publishedAt)}</span>
	{/snippet}
	{#snippet belowTitle()}
		<div class="mt-1.5 flex flex-wrap items-center gap-2">
			{#if review.stars}
				<span class="inline-flex items-center gap-0.5" title={`${review.stars} of 5 stars`} aria-label={`${review.stars} of 5 stars`}>
					{#each [1, 2, 3, 4, 5] as n (n)}
						<Star class={['size-4', n <= review.stars ? 'fill-ink text-ink' : 'text-faint']} aria-hidden="true" />
					{/each}
				</span>
			{/if}
			{#if needsReply}
				<Badge pill variant="warning">Needs a reply</Badge>
			{:else if review.ownerResponse}
				<Badge pill variant="quiet">Owner replied</Badge>
			{/if}
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
		<div class="flex min-w-0 flex-col gap-5">
			<AdminPanel title="What they wrote" note={review.language && translated ? `in ${review.language.toUpperCase()}, translated` : undefined}>
				{#if shown}
					<p class={['m-0 text-base leading-relaxed whitespace-pre-line', long && !expanded && 'line-clamp-8']}>{shown}</p>
					{#if original && (!long || expanded)}
						<p class="text-muted-foreground border-line m-0 mt-3 border-l-2 pl-3 text-sm whitespace-pre-line">{original}</p>
					{/if}
					{#if long}
						<button type="button" class="text-ink mt-2 text-sm font-medium underline underline-offset-4" onclick={() => (expanded = !expanded)}>
							{expanded ? 'Fold it' : `Read all${original ? ', with the original' : ''}`}
						</button>
					{/if}
				{:else}
					<p class="text-muted-foreground m-0 text-sm">Stars only: the reviewer wrote nothing.</p>
				{/if}
				{#if review.ownerResponse}
					<div class="bg-wash mt-4 rounded-md px-3 py-2.5 text-sm">
						<p class="text-muted-foreground m-0 mb-1 text-xs">
							The owner replied{review.ownerResponseAt ? ` on ${onDay(review.ownerResponseAt)}` : ''}
						</p>
						<p class="m-0 whitespace-pre-line">{review.ownerResponse}</p>
					</div>
				{/if}
			</AdminPanel>

			<AdminPanel title="Claims" note={claimCount || undefined}>
				<ReviewClaims {statements} {selected} cityId={review.city.id} {month} />
			</AdminPanel>
		</div>

		<AdminPanel title="Review">
			<AdminFacts items={facts} />
		</AdminPanel>
	</div>

	<AdminRawJson value={review} />
</div>
