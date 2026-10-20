<script lang="ts">
	import type { AdminBrandBranchOutputDto, AdminBrandOutputDto, AdminVenueOutputDto } from 'client';

	import { untrack } from 'svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import VenueDemandPanel from '#components/admin/venues/VenueDemandPanel.svelte';
	import VenueRatingPanel from '#components/admin/venues/VenueRatingPanel.svelte';
	import VenueSearchRanksPanel from '#components/admin/venues/VenueSearchRanksPanel.svelte';
	import { api } from '#lib/api.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The data points beyond posts and reviews: open tables, foot traffic, delivery, where it
	// ranks on Google Maps searches and its rating over time (its own accounts are on the
	// Overview). Place-bound figures are one branch's: the busiest, unless another is picked.
	interface Props {
		brand: AdminBrandOutputDto;
		described?: AdminBrandBranchOutputDto;
	}

	let { brand, described }: Props = $props();

	const branches = $derived(brand.branches.filter((b) => !b.closed));
	const chain = $derived(brand.branches.length > 1);
	let branchId = $state<string | undefined>(undefined);
	$effect(() => {
		branchId ??= described?.id;
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
			<span class="text-muted-foreground">Place figures of</span>
			<div class="w-80">
				<Select items={BRANCHES} bind:value={branchId} aria-label="Branch" size="sm" />
			</div>
			{#if branchId === described?.id}
				<span class="text-muted-foreground text-xs">the busiest place: the report describes it</span>
			{/if}
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
					<VenueRatingPanel {venue} />
				</div>
			</div>
		{/key}
	{/if}

</div>
