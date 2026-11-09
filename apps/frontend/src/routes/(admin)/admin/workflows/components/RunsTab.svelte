<script lang="ts">
	import { type AdminWorkflowOutputDto, ListWorkflowsParamsStatusEnum as Status } from 'client';

	import { onMount } from 'svelte';

	import RunAttributesCell from './RunAttributesCell.svelte';

	import { workflowStatusVariant } from '#components/admin/admin-format.js';
	import { cityFilter } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import {
		formatDuration,
		workflowDuration,
		workflowHref,
		workflowStatusLabel,
		workflowTitle
	} from '#lib/workflow-status.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// Every run, newest first. DBOS counts nothing, so the pager only knows whether there is
	// a next page. A live list: it looks again every ten seconds.
	adminCitiesStore.load();

	let refreshKey = $state(0);
	onMount(() => {
		const timer = setInterval(() => refreshKey++, 10_000);
		return () => clearInterval(timer);
	});

	// The queues and schedules the filters offer, by their declared names
	let queueNames = $state<string[]>([]);
	let scheduleNames = $state<string[]>([]);
	onMount(() => {
		api.admin
			.listQueues()
			.then((res) => (queueNames = res.items.map((q) => q.name).sort()))
			.catch(() => {});
		api.admin
			.listSchedules()
			.then((res) => (scheduleNames = res.items.map((s) => s.name).sort()))
			.catch(() => {});
	});

	const FILTERS: Filter[] = $derived([
		{
			key: 'status',
			name: 'Status',
			type: 'select',
			options: Object.values(Status).map((value) => ({ name: workflowStatusLabel(value), value }))
		},
		{ key: 'name', name: 'Workflow', type: 'text', placeholder: 'Method name, e.g. ingestCity' },
		{ key: 'queue', name: 'Queue', type: 'select', options: queueNames.map((name) => ({ name, value: name })) },
		{
			key: 'schedule',
			name: 'Schedule',
			type: 'select',
			options: scheduleNames.map((name) => ({ name, value: name }))
		},
		cityFilter(adminCitiesStore.list),
		{ key: 'attribute', name: 'Tag', type: 'text', placeholder: 'key:value, e.g. purpose:ingest' }
	]);

	// A select filter hands over a one-item array; the city is a tag like any other
	const first = (value: unknown) => ((Array.isArray(value) ? value[0] : value) as string | undefined) || undefined;
	const listRuns = (query: Record<string, unknown> & { page: number; size: number }) => {
		const cityId = first(query.cityId);
		const tag = first(query.attribute)?.trim();
		return api.admin.listWorkflows({
			page: query.page,
			size: query.size,
			status: first(query.status) as Status | undefined,
			name: first(query.name)?.trim() || undefined,
			queue: first(query.queue),
			schedule: first(query.schedule),
			attribute: tag || (cityId ? `cityId:${cityId}` : undefined)
		});
	};

	const COLUMNS: Column<AdminWorkflowOutputDto>[] = [
		{
			type: 'badge',
			name: 'Status',
			value: (row) => workflowStatusLabel(row.status),
			variant: (row) => workflowStatusVariant(row.status)
		},
		{
			type: 'link',
			name: 'Workflow',
			truncate: 44,
			href: (row) => workflowHref(row.id),
			value: (row) => workflowTitle(row)
		},
		{ type: 'value', name: 'Queue', value: (row) => row.queue ?? '' },
		{ type: 'value', name: 'Schedule', truncate: 26, value: (row) => row.schedule ?? '' },
		{
			type: 'component',
			name: 'Tags',
			component: RunAttributesCell,
			props: (row) => ({ attributes: row.attributes, priority: row.priority })
		},
		{ type: 'date', name: 'Created', relative: true, value: (row) => row.createdAt },
		{ type: 'date', name: 'Completed', value: (row) => row.completedAt },
		{
			type: 'value',
			name: 'Took',
			numeric: true,
			value: (row) => {
				const ms = workflowDuration(row);
				return ms === undefined ? '' : formatDuration(ms);
			}
		},
		{ type: 'value', name: 'Error', truncate: 48, value: (row) => row.error ?? '' }
	];
</script>

<PaginatedDataTable
	syncWithSearchParams
	key={refreshKey}
	api={listRuns}
	noun="runs"
	availableFilters={FILTERS}
	columns={COLUMNS}
	limit={25}
	emptyDescription="A run shows up here once a schedule fires or a service starts one."
	rowKey={(row) => row.id}
	rowHref={(row) => workflowHref(row.id)} />
