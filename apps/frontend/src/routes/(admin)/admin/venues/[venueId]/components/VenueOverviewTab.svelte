<script lang="ts">
	import type { AdminVenueOutputDto } from 'client';

	import { at } from '#components/admin/admin-format.js';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import BrandAccounts from '#components/admin/BrandAccounts.svelte';
	import VenueDemandPanel from '#components/admin/venues/VenueDemandPanel.svelte';
	import VenueDetailsPanel from '#components/admin/venues/VenueDetailsPanel.svelte';
	import VenueDishSearchesPanel from '#components/admin/venues/VenueDishSearchesPanel.svelte';
	import VenueRatingPanel from '#components/admin/venues/VenueRatingPanel.svelte';
	import VenueSearchRanksPanel from '#components/admin/venues/VenueSearchRanksPanel.svelte';
	import VenueTopicsPanel from '#components/admin/venues/VenueTopicsPanel.svelte';

	// The place itself: Google's facts and details, the food it is known for, demand and where it
	// ranks. What is said about the business as a whole lives on its brand's page.
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	const facts = $derived<AdminFact[]>([
		{ label: 'Google Place ID', value: venue.placeId, mono: true },
		{ label: 'Category', value: venue.category },
		{ label: 'Also listed as', value: venue.categories?.join(', ') },
		{ label: 'Price level', value: venue.priceLevel },
		{ label: 'Phone', value: venue.phone },
		{ label: 'Website', value: venue.website, href: venue.website ?? undefined },
		{ label: 'City', value: venue.city.name },
		{ label: 'First seen', value: at(venue.createdAt) },
		{ label: 'Updated', value: at(venue.updatedAt) }
	]);
</script>

<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
	<div class="flex min-w-0 flex-col gap-5">
		<AdminPanel title="Place">
			<AdminFacts items={facts} />
		</AdminPanel>
		<!-- The brand's accounts this place posts as: brand-wide ones, and a chain branch's own -->
		<BrandAccounts
			brandId={venue.brand.id}
			{...venue.brand.branches > 1 && {
				branchId: venue.id,
				branches: [{ id: venue.id, name: venue.name, street: venue.street ?? undefined }]
			}} />
		<VenueTopicsPanel {venue} />
		<VenueDetailsPanel {venue} />
	</div>
	<div class="flex min-w-0 flex-col gap-5">
		<VenueDemandPanel {venue} />
		<VenueSearchRanksPanel {venue} />
		<VenueDishSearchesPanel {venue} />
		<VenueRatingPanel {venue} />
	</div>
</div>

<AdminRawJson value={venue} />
