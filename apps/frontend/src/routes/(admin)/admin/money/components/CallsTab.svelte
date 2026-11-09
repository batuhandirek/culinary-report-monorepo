<script lang="ts">
	import type { AdminLlmCallOutputDto } from 'client';

	import { providerLabel } from '#constants/ADMIN_MONEY_TABS.js';
	import { cityFilter } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { tokens, usd } from '#lib/spend-format.js';
	import { formatDuration, workflowHref } from '#lib/workflow-status.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// Every LLM call in the ledger, newest first: who asked, which model answered, what it
	// cost, how long it took, and the run and city it was for.
	adminCitiesStore.load();

	const FILTERS: Filter[] = $derived([
		{ key: 'agentId', name: 'Agent', type: 'text', placeholder: 'Agent id, e.g. post-claims' },
		{ key: 'purpose', name: 'Purpose', type: 'text', placeholder: 'e.g. ingest or pipeline:SCRAPE_POSTS' },
		cityFilter(adminCitiesStore.list),
		{ key: 'workflowId', name: 'Workflow run', type: 'text', placeholder: 'Run id' },
		{ key: 'failed', name: 'Failed only', type: 'toggle' }
	]);

	// A select filter hands over a one-item array
	const first = (value: unknown) => ((Array.isArray(value) ? value[0] : value) as string | undefined) || undefined;
	const trimmed = (value: unknown) => first(value)?.trim() || undefined;
	const listCalls = (query: Record<string, unknown> & { page: number; size: number }) =>
		api.admin.listLlmCalls({
			page: query.page,
			size: query.size,
			agentId: trimmed(query.agentId),
			purpose: trimmed(query.purpose),
			workflowId: trimmed(query.workflowId),
			cityId: first(query.cityId),
			failed: query.failed === true || undefined
		});

	const COLUMNS: Column<AdminLlmCallOutputDto>[] = [
		{ type: 'date', name: 'When', relative: true, value: (row) => row.createdAt },
		{ type: 'value', name: 'Agent', truncate: 30, value: (row) => row.agentId },
		{ type: 'value', name: 'Kind', value: (row) => row.kind },
		{ type: 'value', name: 'Model', truncate: 34, value: (row) => row.model ?? '' },
		{ type: 'value', name: 'Provider', value: (row) => providerLabel(row.provider) },
		{ type: 'value', name: 'In', label: 'Input', numeric: true, value: (row) => tokens(row.inputTokens) },
		{ type: 'value', name: 'Cached', numeric: true, value: (row) => (row.cachedInputTokens ? tokens(row.cachedInputTokens) : '') },
		{ type: 'value', name: 'Out', label: 'Output', numeric: true, value: (row) => tokens(row.outputTokens) },
		{ type: 'value', name: 'Cost', numeric: true, value: (row) => usd(row.usd) },
		{ type: 'value', name: 'Took', numeric: true, value: (row) => (row.durationMs === undefined ? '' : formatDuration(row.durationMs)) },
		{
			type: 'badge',
			name: 'Result',
			value: (row) => (row.ok ? 'OK' : 'Failed'),
			variant: (row) => (row.ok ? 'success' : 'destructive')
		},
		{ type: 'value', name: 'Error', truncate: 40, value: (row) => row.error ?? '' },
		{ type: 'value', name: 'City', value: (row) => row.city?.name ?? '' },
		{ type: 'value', name: 'Purpose', truncate: 28, value: (row) => row.purpose ?? '' },
		{
			type: 'link',
			name: 'Run',
			href: (row) => (row.workflowId ? workflowHref(row.workflowId) : ''),
			value: (row) => (row.workflowId ? { value: row.workflowId.slice(0, 8), class: 'font-mono text-xs' } : '')
		}
	];
</script>

<PaginatedDataTable
	syncWithSearchParams
	api={listCalls}
	noun="calls"
	availableFilters={FILTERS}
	columns={COLUMNS}
	limit={25}
	emptyDescription="Every agent and classifier call is filed here as it is made." />
