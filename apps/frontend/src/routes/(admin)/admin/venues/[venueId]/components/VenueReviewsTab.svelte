<script lang="ts">
	import type { AdminReviewOutputDto, AdminVenueOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { monthLabel, recentMonths, sentimentVariant } from '#lib/culinary.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	const FILTERS: Filter[] = [
		{
			key: 'month',
			name: 'Month',
			type: 'select',
			options: recentMonths(12).map((m) => ({ name: monthLabel(m), value: m }))
		}
	];
	const COLUMNS: Column<AdminReviewOutputDto>[] = [
		{ type: 'date', name: 'Published', format: 'date', value: (row) => row.publishedAt },
		{ type: 'value', name: 'Stars', value: (row) => (row.stars ? '★'.repeat(row.stars) : '') },
		{
			type: 'value',
			name: 'Review',
			truncate: 80,
			value: (row) => row.textTranslated || row.text || ''
		},
		{
			type: 'badge',
			name: 'Sentiment',
			value: (row) => row.sentiment,
			variant: (row) => sentimentVariant(row.sentiment)
		},
		{
			type: 'value',
			name: 'Changes noticed',
			truncate: 40,
			value: (row) => row.changes?.join(', ') ?? ''
		},
		{ type: 'value', name: 'Owner replied', value: (row) => (row.ownerResponse ? 'Yes' : '') }
	];

	// The API takes the venue id as its own argument
	const listReviews = (query: { page: number; size: number; month?: string }) =>
		api.admin.listVenueReviews(venue.id, query);
</script>

<PaginatedDataTable api={listReviews} noun="reviews" availableFilters={FILTERS} columns={COLUMNS} />
