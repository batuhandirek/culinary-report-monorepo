<script lang="ts">
	import type { AdminReportListItemOutputDto } from 'client';

	import { ListReportsParamsSortEnum } from 'client';

	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import { cityFilter } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { monthLabel, recentMonths } from '#lib/culinary.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	const SORTS: Sort[] = [
		{ value: ListReportsParamsSortEnum.UpdatedAtDesc, name: 'Latest built' },
		{ value: ListReportsParamsSortEnum.PostCountDesc, name: 'Most posts' },
		{ value: ListReportsParamsSortEnum.ReviewCountDesc, name: 'Most reviews' },
		{ value: ListReportsParamsSortEnum.MonthDesc, name: 'Newest month' }
	];
	adminCitiesStore.load();
	const FILTERS: Filter[] = $derived([
		cityFilter(adminCitiesStore.list),
		{
			key: 'month',
			name: 'Month',
			type: 'select',
			options: recentMonths(12).map((m) => ({ name: monthLabel(m), value: m }))
		}
	]);
	const COLUMNS: Column<AdminReportListItemOutputDto>[] = [
		{
			type: 'link',
			name: 'Brand',
			truncate: 34,
			href: (row) => `/admin/brands/${row.brand.id}`,
			value: (row) => row.brand.name
		},
		{ type: 'value', name: 'City', value: (row) => row.city?.name ?? 'All cities' },
		{ type: 'value', name: 'Month', value: (row) => monthLabel(row.month) },
		{ type: 'value', name: 'Headline', truncate: 80, value: (row) => row.headline },
		{
			type: 'count',
			name: 'Posts',
			value: (row) => row.postCount,
			sort: {
				asc: ListReportsParamsSortEnum.PostCountAsc,
				desc: ListReportsParamsSortEnum.PostCountDesc
			}
		},
		{
			type: 'count',
			name: 'Reviews',
			value: (row) => row.reviewCount,
			sort: {
				asc: ListReportsParamsSortEnum.ReviewCountAsc,
				desc: ListReportsParamsSortEnum.ReviewCountDesc
			}
		},
		{ type: 'date', name: 'Built', relative: true, value: (row) => row.updatedAt },
		{ type: 'date', name: 'Sent', format: 'date', value: (row) => row.sentAt }
	];

	const filters = { sort: ListReportsParamsSortEnum.UpdatedAtDesc };
</script>

<AdminListPage>
	<PaginatedDataTable
		syncWithSearchParams
		{filters}
		api={api.admin.listReports}
		noun="reports"
		availableFilters={FILTERS}
		availableSorts={SORTS}
		columns={COLUMNS}
		emptyDescription="Build one from a venue's page, or run the pipeline's “Build reports” step."
		rowHref={(row) => `/admin/reports/${row.id}`} />
</AdminListPage>
