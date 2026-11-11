<script lang="ts">
	import {
		Check,
		Clock,
		Code,
		Copy,
		Globe,
		Map as MapIcon,
		MapPin,
		MessageCircle,
		Phone,
		RefreshCw,
		Rows3,
		Star,
		Store
	} from '@lucide/svelte';
	import type { AdminBrandOutputDto, AdminVenueOutputDto } from 'client';

	import { untrack } from 'svelte';

	import VenueMentionsTab from './components/VenueMentionsTab.svelte';
	import VenueOverviewTab from './components/VenueOverviewTab.svelte';

	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { at } from '#components/admin/admin-format.js';
	import AdminDetailTabs, { type AdminDetailTab } from '#components/admin/AdminDetailTabs.svelte';
	import BrandAccounts from '#components/admin/BrandAccounts.svelte';
	import BranchSwitcher from '#components/admin/detail/BranchSwitcher.svelte';
	import DetailHead from '#components/admin/detail/DetailHead.svelte';
	import IconKey from '#components/admin/detail/IconKey.svelte';
	import Pill from '#components/admin/detail/Pill.svelte';
	import RawRecordDialog from '#components/admin/RawRecordDialog.svelte';
	import ReviewsTable from '#components/admin/reviews/ReviewsTable.svelte';
	import ClaimsTable from '#components/admin/statements/ClaimsTable.svelte';
	import { api } from '#lib/api.js';
	import { LEAD_PROSPECT_SCORE } from '#lib/culinary.js';
	import { exploreHref } from '#lib/explore.js';
	import { followWorkflow } from '#lib/workflow-follow.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	// One place: a branch of its brand. Google's data, its demand and its own posts and reviews;
	// the brand page holds what belongs to the business (sales, reports, competitors, the score).
	let { data } = $props();
	let venue: AdminVenueOutputDto = $derived(data.venue);
	const chain = $derived(venue.brand.branches > 1);

	// Its brand with every branch: the place switcher and the brand's stars on the Place tab
	let brand = $state<AdminBrandOutputDto | null>(null);
	$effect(() => {
		const id = venue.brand.id;
		untrack(() => {
			brand = null;
			api.admin
				.getBrand(id)
				.then((b) => (brand = b))
				.catch(() => {});
		});
	});

	const tabs: AdminDetailTab[] = $derived([
		{ value: 'overview', label: 'Place', icon: MapPin },
		{ value: 'mentions', label: 'Posts', icon: Rows3, count: venue.mentionCount },
		{ value: 'reviews', label: 'Reviews', icon: Star, count: venue.reviewsCount ?? undefined },
		{ value: 'claims', label: 'Claims', icon: MessageCircle }
	]);
	let tab = $state('overview');
	const openTab = (next: string) => {
		const url = new URL(page.url.href);
		for (const name of [...url.searchParams.keys()]) url.searchParams.delete(name);
		if (next !== 'overview') url.searchParams.set('tab', next);
		goto(url, { replace: true, reset: false });
	};

	const address = $derived([venue.street, venue.postalCode].filter(Boolean).join(', '));
	let copied = $state(false);
	const copyAddress = async () => {
		await navigator.clipboard.writeText([address, venue.locality ?? venue.city.name].filter(Boolean).join(' '));
		copied = true;
		setTimeout(() => (copied = false), 1500);
	};
	const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
	let rawOpen = $state(false);

	// "Refresh from Google": its detail page read again in the background (under a cent); the
	// page follows the run and reloads the place when it ends
	const refreshAction = createAction(
		async () => {
			const { workflowId } = await api.admin.refreshVenue(venue.id);
			const run = await followWorkflow(workflowId, 3 * 60_000);
			if (run.status === 'failed') throw new Error(run.error);
			if (run.status === 'still running') throw new Error('Still refreshing after three minutes: see its run on Workflows');
			await invalidate(`venue:${venue.id}`);
			return workflowId;
		},
		{ successNotification: () => ({ title: 'Refreshed from Google', text: venue.name }) }
	);
</script>

<DetailHead title={venue.name} favicon={venue.favicon}>
	{#snippet pills()}
		{#if venue.rating}
			<Pill tone="ink">{venue.rating.toFixed(1)} ★ · {(venue.reviewsCount ?? 0).toLocaleString('en')}</Pill>
		{/if}
		{#if venue.priceLevel}<Pill>{venue.priceLevel}</Pill>{/if}
		{#if venue.closed}
			<Pill tone="bad">Permanently closed</Pill>
		{:else if venue.details?.temporarilyClosed}
			<Pill tone="bad">Temporarily closed</Pill>
		{/if}
		{#if venue.brand.leadScore != null}
			<Pill
				tone={venue.brand.leadScore >= LEAD_PROSPECT_SCORE ? 'good' : 'sand'}
				href={`/admin/brands/${venue.brand.id}?tab=history`}
				title="The brand's lead score">Lead {Math.round(venue.brand.leadScore)}</Pill>
		{/if}
	{/snippet}
	{#snippet sub()}
		<span class="text-muted-foreground">
			{chain ? 'Branch of' : 'Brand:'} <a href={`/admin/brands/${venue.brand.id}`}>{venue.brand.name}</a>{venue.category
				? ` · ${venue.category}`
				: ''}
		</span>
		{#if address || venue.district}
			<span class="group inline-flex items-center gap-[5px]">
				<MapPin class="text-faint size-[13px]" strokeWidth={1.8} />
				{#if address}<span>{address}</span>{/if}
				{#if venue.district}
					<Pill
						tone="outline"
						href={exploreHref({ cityId: venue.city.id, district: venue.district })}
						title={`What is said in ${venue.district}`}>{venue.district}</Pill>
				{/if}
				{#if address}
					<span class="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
						<IconButton icon={copied ? Check : Copy} label="Copy address" variant="ghost" xs onclick={copyAddress} />
					</span>
				{/if}
			</span>
		{/if}
	{/snippet}
	{#snippet actions()}
		{#if venue.googleUrl}<IconKey icon={MapIcon} label="Open in Google Maps" href={venue.googleUrl} />{/if}
		{#if venue.phone}<IconKey icon={Phone} label={venue.phone} copy={venue.phone} />{/if}
		{#if venue.website}<IconKey icon={Globe} label={`Website · ${host(venue.website)}`} href={venue.website} />{/if}
		<!-- The brand's accounts this place posts as: brand-wide ones, and a chain branch's own -->
		<BrandAccounts
			brandId={venue.brand.id}
			{...chain && { branchId: venue.id, branches: [{ id: venue.id, name: venue.name, street: venue.street ?? undefined }] }} />
		<IconKey icon={Code} label="Raw record" onclick={() => (rawOpen = true)} />
		<span class="bg-line mx-[3px] h-5 w-px"></span>
		{#if chain}
			<BranchSwitcher
				brandId={venue.brand.id}
				brandName={venue.brand.name}
				count={venue.brand.branches}
				branches={brand?.branches ?? null}
				current={venue.id} />
		{:else}
			<IconKey icon={Store} label="Its brand: posts, sales, reports" href={`/admin/brands/${venue.brand.id}`} internal />
		{/if}
	{/snippet}
</DetailHead>

<div class="flex min-w-0 flex-col gap-3 pb-12">
	<AdminDetailTabs {tabs} bind:value={tab} dense>
		{#snippet end()}
			<span class="group flex items-center gap-[5px]" title={`First seen ${at(venue.createdAt)}`}>
				<Clock class="size-3" strokeWidth={1.8} />Updated {at(venue.updatedAt)}
				<span class={refreshAction.executing ? '' : 'opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'}>
					<IconButton
						icon={RefreshCw}
						label="Refresh from Google"
						variant="ghost"
						xs
						loading={refreshAction.executing}
						onclick={() => refreshAction.execute()} />
				</span>
			</span>
		{/snippet}
	</AdminDetailTabs>
	{#key venue.id}
		{#if tab === 'overview'}
			<VenueOverviewTab {venue} {brand} {openTab} />
		{:else if tab === 'mentions'}
			<VenueMentionsTab {venue} />
		{:else if tab === 'reviews'}
			<ReviewsTable scope={{ venueId: venue.id }} />
		{:else if tab === 'claims'}
			<p class="m-0 -mb-2 text-sm">
				<a class="text-beet" href={exploreHref({ cityId: venue.city.id, brandId: venue.brand.id, venueId: venue.id })}>Explore what is said about it</a>
				<span class="text-muted-foreground">: any topic, broken down by month and source</span>
			</p>
			<ClaimsTable
				scope={{ venueId: venue.id }}
				topicsCityId={venue.city.id}
				scopeLabel="What its reviews and the posts naming this branch say" />
		{/if}
	{/key}
</div>

<RawRecordDialog value={venue} bind:active={rawOpen} />
