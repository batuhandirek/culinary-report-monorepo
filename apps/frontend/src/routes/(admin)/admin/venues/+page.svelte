<script lang="ts">
	import type { AdminVenueListItemOutputDto } from 'client';

	import { ListVenuesParamsSortEnum } from 'client';

	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import VenueFavicon from '#components/admin/venues/VenueFavicon.svelte';
	import { cityFilter, districtOptions } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { LEAD_PROSPECT_SCORE, leadScoreVariant } from '#lib/culinary.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	const SORTS: Sort[] = [
		{ value: ListVenuesParamsSortEnum.MentionCountDesc, name: 'Most mentioned' },
		{ value: ListVenuesParamsSortEnum.LeadScoreDesc, name: 'Best prospects' },
		{ value: ListVenuesParamsSortEnum.ReviewsCountDesc, name: 'Most Google reviews' },
		{ value: ListVenuesParamsSortEnum.RatingDesc, name: 'Best rated' },
		{ value: ListVenuesParamsSortEnum.NameAsc, name: 'Name A–Z' },
		{ value: ListVenuesParamsSortEnum.CreatedAtDesc, name: 'Newest first' }
	];
	adminCitiesStore.load();
	const FILTERS: Filter[] = $derived([
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Name, street or category…' },
		cityFilter(adminCitiesStore.list),
		{
			key: 'district',
			name: 'District',
			type: 'select',
			options: districtOptions(adminCitiesStore.list)
		},
		{ key: 'mentionedOnly', name: 'Mentioned on social media', type: 'toggle' },
		{
			key: 'prospectsOnly',
			name: `Prospects only (lead score ${LEAD_PROSPECT_SCORE}+)`,
			type: 'toggle'
		},
		{ key: 'newOnly', name: 'New venues (opened in the last 6 months)', type: 'toggle' }
	]);
	const COLUMNS: Column<AdminVenueListItemOutputDto>[] = [
		{
			type: 'component',
			name: 'Icon',
			label: '',
			class: 'w-6 pr-0',
			component: VenueFavicon,
			props: (row) => ({ favicon: row.favicon })
		},
		{
			type: 'link',
			name: 'Name',
			truncate: 40,
			href: (row) => `/admin/venues/${row.id}`,
			value: (row) => row.name,
			sort: { asc: ListVenuesParamsSortEnum.NameAsc, desc: ListVenuesParamsSortEnum.NameDesc }
		},
		{ type: 'value', name: 'Category', truncate: 28, value: (row) => row.category ?? '' },
		{ type: 'value', name: 'District', truncate: 26, value: (row) => row.district ?? '' },
		{
			type: 'value',
			name: 'Rating',
			numeric: true,
			value: (row) => (row.rating ? `${row.rating.toFixed(1)} ★` : ''),
			sort: {
				asc: ListVenuesParamsSortEnum.RatingAsc,
				desc: ListVenuesParamsSortEnum.RatingDesc
			}
		},
		{
			type: 'count',
			name: 'Google reviews',
			value: (row) => row.reviewsCount,
			sort: {
				asc: ListVenuesParamsSortEnum.ReviewsCountAsc,
				desc: ListVenuesParamsSortEnum.ReviewsCountDesc
			}
		},
		{
			type: 'count',
			name: 'Mentions',
			tone: 'success',
			value: (row) => row.mentionCount,
			sort: {
				asc: ListVenuesParamsSortEnum.MentionCountAsc,
				desc: ListVenuesParamsSortEnum.MentionCountDesc
			}
		},
		{
			type: 'badge',
			name: 'Lead score',
			numeric: true,
			// The brand's: a chain's branches share it
			value: (row) => (row.brand.leadScore == null ? null : Math.round(row.brand.leadScore).toString()),
			variant: (row) => leadScoreVariant(row.brand.leadScore),
			sort: {
				asc: ListVenuesParamsSortEnum.LeadScoreAsc,
				desc: ListVenuesParamsSortEnum.LeadScoreDesc
			}
		}
	];

	const filters = { sort: ListVenuesParamsSortEnum.MentionCountDesc, q: undefined };
</script>

<AdminListPage>
	<PaginatedDataTable
		syncWithSearchParams
		{filters}
		api={api.admin.listVenues}
		noun="venues"
		availableFilters={FILTERS}
		availableSorts={SORTS}
		columns={COLUMNS}
		rowHref={(row) => `/admin/venues/${row.id}`} />
</AdminListPage>
