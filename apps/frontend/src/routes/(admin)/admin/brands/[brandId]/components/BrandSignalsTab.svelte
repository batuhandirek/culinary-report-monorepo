<script lang="ts">
	import type { AdminBrandOutputDto, AdminVenueOutputDto } from 'client';

	import { untrack } from 'svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import VenueDemandPanel from '#components/admin/venues/VenueDemandPanel.svelte';
	import VenueDishSearchesPanel from '#components/admin/venues/VenueDishSearchesPanel.svelte';
	import VenueRatingPanel from '#components/admin/venues/VenueRatingPanel.svelte';
	import VenueSearchRanksPanel from '#components/admin/venues/VenueSearchRanksPanel.svelte';
	import { api } from '#lib/api.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The data points beyond posts and reviews: open tables, foot traffic, delivery, where it
	// ranks on Google Maps searches and its rating over time (its own accounts are on the
	// Overview). Each branch has its own: pick any of the city's open branches (the most
	// reviewed first), as the report shows each one.
	interface Props {
		brand: AdminBrandOutputDto;
		cityId?: string;
	}

	let { brand, cityId }: Props = $props();

	const branches = $derived(
		brand.branches
			.filter((b) => !b.closed && (!cityId || b.city.id === cityId))
			.sort((a, b) => (b.reviewsCount ?? -1) - (a.reviewsCount ?? -1))
	);
	const chain = $derived(brand.branches.length > 1);
	let branchId = $state<string | undefined>(undefined);
	$effect(() => {
		if (!branches.some((b) => b.id === branchId)) branchId = branches[0]?.id;
	});
	const BRANCHES = $derived(
		branches.map((b) => ({ value: b.id, label: [b.name, b.street].filter(Boolean).join(' · ') }))
	);

	let venue = $state<AdminVenueOutputDto | null>(null);
	const loader = createLoader((id: string) => api.admin.getVenue(id), {
		onSuccess: (v) => (venue = v)
	});
	$effect(() => {
		const id = branchId;
		if (id) untrack(() => loader.load(id));
	});
</script>

<div class="flex min-w-0 flex-col gap-5">
	{#if chain && BRANCHES.length > 1}
		<div class="flex items-center gap-3 text-sm">
			<span class="text-muted-foreground">Branch</span>
			<div class="w-80">
				<Select items={BRANCHES} bind:value={branchId} aria-label="Branch" size="sm" />
			</div>
		</div>
	{/if}

	{#if loader.failed}
		<ErrorState title="Couldn't load the place" onRetry={() => loader.reload()} />
	{:else if !venue || venue.id !== branchId}
		<AdminPanel><SkeletonRows count={4} /></AdminPanel>
	{:else}
		{#key venue.id}
			<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
				<VenueDemandPanel {venue} />
				<div class="flex min-w-0 flex-col gap-5">
					<VenueSearchRanksPanel {venue} />
					<VenueDishSearchesPanel {venue} />
					<VenueRatingPanel {venue} />
				</div>
			</div>
		{/key}
	{/if}

</div>
