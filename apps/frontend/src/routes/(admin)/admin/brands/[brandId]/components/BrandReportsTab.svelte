<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';
	import type { AdminBrandOutputDto, AdminReportListItemOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import type {
		Column,
		PaginatedDataTableAction
	} from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';

	// The brand's monthly reports in the city (or across its cities). "Build report" above makes
	// the month picked there; Rebuild after fixing a mention or a competitor.
	interface Props {
		brand: AdminBrandOutputDto;
		cityId?: string;
	}

	let { brand, cityId }: Props = $props();

	const acrossCities = $derived(brand.reportScope === 'all');

	const COLUMNS: Column<AdminReportListItemOutputDto>[] = [
		{
			type: 'link',
			name: 'Month',
			href: (row) => `/admin/reports/${row.id}`,
			value: (row) => monthLabel(row.month)
		},
		{ type: 'value', name: 'Headline', truncate: 64, value: (row) => row.headline },
		{ type: 'count', name: 'Posts', value: (row) => row.postCount },
		{ type: 'count', name: 'Reviews', value: (row) => row.reviewCount },
		{ type: 'date', name: 'Built', relative: true, value: (row) => row.updatedAt },
		{ type: 'date', name: 'Sent', format: 'date', value: (row) => row.sentAt }
	];

	let version = $state(0);
	const rebuildAction = createAction(
		(row: AdminReportListItemOutputDto) =>
			api.admin.buildReport({ brandId: brand.id, cityId: row.city?.id, month: row.month }),
		{
			onSuccess: () => version++,
			successNotification: (_, [row]) => ({
				title: 'Report rebuilt',
				text: `${brand.name}, ${monthLabel(row.month)}`
			})
		}
	);
	const ACTIONS: PaginatedDataTableAction<AdminReportListItemOutputDto>[] = [
		{
			icon: RefreshCw,
			label: 'Rebuild report',
			onClick: (row) => {
				rebuildAction.execute(row);
			}
		}
	];
</script>

<PaginatedDataTable
	filters={{ brandId: brand.id, ...(acrossCities || !cityId ? {} : { cityId }) }}
	api={api.admin.listReports}
	noun="reports"
	columns={COLUMNS}
	actions={ACTIONS}
	key={version}
	emptyDescription="Pick a month and use “Build report” above."
	rowHref={(row) => `/admin/reports/${row.id}`} />
