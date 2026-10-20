<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import type { AdminCityListItemOutputDto } from 'client';

	import CityFormDialog from './components/CityFormDialog.svelte';

	import { goto } from '$app/navigation';
	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import { api } from '#lib/api.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	// Few rows: one request, shown as one page
	const listCities = async () => {
		const { items } = await api.admin.listCities();
		return { items, page: 1, pageSize: Math.max(items.length, 1), totalItems: items.length };
	};

	const COLUMNS: Column<AdminCityListItemOutputDto>[] = [
		{
			type: 'link',
			name: 'Name',
			truncate: 30,
			href: (row) => `/admin/cities/${row.id}`,
			value: (row) => row.name
		},
		{ type: 'value', name: 'Country', value: (row) => row.country },
		{ type: 'value', name: 'Language', value: (row) => row.language },
		{
			type: 'badge',
			name: 'Pipeline',
			value: (row) => (row.active ? 'Active' : 'Paused'),
			variant: (row) => (row.active ? 'success' : 'secondary')
		},
		{
			type: 'badge',
			name: 'Monthly run',
			value: (row) => (row.cronEnabled ? 'On' : 'Off'),
			variant: (row) => (row.cronEnabled ? 'success' : 'secondary')
		},
		{
			type: 'badge',
			name: 'Instagram',
			value: (row) => (row.instagramEnabled ? 'On' : 'Off'),
			variant: (row) => (row.instagramEnabled ? 'success' : 'secondary')
		},
		{ type: 'count', name: 'Districts', value: (row) => row.districts.length },
		{
			type: 'value',
			name: 'Sources',
			numeric: true,
			value: (row) => `${row.enabledSources} of ${row.sources} on`
		},
		{ type: 'count', name: 'Venues', tone: 'success', value: (row) => row.venues },
		{ type: 'date', name: 'Added', format: 'date', value: (row) => row.createdAt }
	];

	let creating = $state(false);
</script>

<AdminListPage>
	{#snippet actions()}
		<Button size="sm" icon={Plus} onclick={() => (creating = true)}>New city</Button>
	{/snippet}
	<PaginatedDataTable
		api={listCities}
		noun="cities"
		columns={COLUMNS}
		rowHref={(row) => `/admin/cities/${row.id}`} />
</AdminListPage>

<CityFormDialog
	bind:active={creating}
	onSaved={(city) => {
		adminCitiesStore.refresh();
		goto(`/admin/cities/${city.id}`);
	}} />
