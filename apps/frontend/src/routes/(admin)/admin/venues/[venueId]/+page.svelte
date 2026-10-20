<script lang="ts">
	import { ArrowLeft, ExternalLink, Globe, MapPin } from '@lucide/svelte';
	import type { AdminVenueOutputDto } from 'client';

	import VenueMentionsTab from './components/VenueMentionsTab.svelte';
	import VenueOverviewTab from './components/VenueOverviewTab.svelte';
	import VenueReviewsTab from './components/VenueReviewsTab.svelte';

	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminDetailTabs, { type AdminDetailTab } from '#components/admin/AdminDetailTabs.svelte';
	import VenueFavicon from '#components/admin/venues/VenueFavicon.svelte';
	import { leadScoreVariant } from '#lib/culinary.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	// One place: a branch of its brand. Google's data, its demand and its own posts and reviews;
	// the brand page holds what belongs to the business (sales, reports, competitors, the score).
	let { data } = $props();
	let venue: AdminVenueOutputDto = $derived(data.venue);
	const chain = $derived(venue.brand.branches > 1);

	const tabs: AdminDetailTab[] = $derived([
		{ value: 'overview', label: 'Place' },
		{ value: 'mentions', label: 'Posts', count: venue.mentionCount },
		{ value: 'reviews', label: 'Reviews' }
	]);
	let tab = $state('overview');
</script>

<AdminPageHeader title={venue.name}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground flex items-center gap-1.5 text-xs">
			{#if venue.favicon}<VenueFavicon favicon={venue.favicon} />{/if}
			{chain ? `Branch of ${venue.brand.name}` : 'Place'} · {venue.category ?? 'No category'}
		</span>
	{/snippet}
	{#snippet belowTitle()}
		<div class="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
			{#if venue.rating}
				<Badge pill variant="secondary">{venue.rating.toFixed(1)} ★ · {venue.reviewsCount ?? 0} reviews</Badge>
			{/if}
			{#if venue.closed}
				<Badge pill variant="destructive">Permanently closed</Badge>
			{/if}
			{#if venue.brand.leadScore != null}
				<Badge pill variant={leadScoreVariant(venue.brand.leadScore)}>Brand lead score {Math.round(venue.brand.leadScore)}</Badge>
			{/if}
			{#if venue.street || venue.district}
				<span class="flex items-center gap-1">
					<MapPin class="size-4 shrink-0" />
					{[venue.street, venue.postalCode, venue.district].filter(Boolean).join(', ')}
				</span>
			{/if}
			{#if venue.googleUrl}
				<a href={venue.googleUrl} target="_blank" rel="noreferrer" class="flex items-center gap-1 hover:underline">
					<ExternalLink class="size-4" /> Google Maps
				</a>
			{/if}
			{#if venue.website}
				<a href={venue.website} target="_blank" rel="noreferrer" class="flex items-center gap-1 hover:underline">
					<Globe class="size-4" /> Website
				</a>
			{/if}
		</div>
	{/snippet}
	{#snippet rightTitle()}
		<Button size="sm" variant="outline" icon={ArrowLeft} href={`/admin/brands/${venue.brand.id}`}>
			{chain ? `${venue.brand.name} (${venue.brand.branches} places)` : 'Brand: posts, sales, reports'}
		</Button>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<AdminDetailTabs {tabs} bind:value={tab} />
	{#key venue.id}
		{#if tab === 'overview'}
			<VenueOverviewTab {venue} />
		{:else if tab === 'mentions'}
			<VenueMentionsTab {venue} />
		{:else if tab === 'reviews'}
			<VenueReviewsTab {venue} />
		{/if}
	{/key}
</div>
