<script lang="ts">
	import type { AdminReviewOutputDto, AdminVenueOutputDto } from 'client';

	import TalksAbout from '#components/admin/statements/TalksAbout.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel, recentMonths } from '#lib/culinary.js';
	import { changeLabel, changesOf } from '#lib/statements.js';
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
			type: 'component',
			name: 'Talks about',
			component: TalksAbout as never,
			props: (row) => ({
				statements: row.statements,
				cityId: venue.city.id,
				month: new Date(row.publishedAt).toISOString().slice(0, 7),
				compact: true
			})
		},
		{
			type: 'value',
			name: 'Changes noticed',
			truncate: 40,
			value: (row) => changesOf(row.statements).map(changeLabel).join(' · ')
		},
		{ type: 'value', name: 'Owner replied', value: (row) => (row.ownerResponse ? 'Yes' : '') }
	];

	// The API takes the venue id as its own argument
	const listReviews = (query: { page: number; size: number; month?: string }) =>
		api.admin.listVenueReviews(venue.id, query);
</script>

<PaginatedDataTable api={listReviews} noun="reviews" availableFilters={FILTERS} columns={COLUMNS} />
