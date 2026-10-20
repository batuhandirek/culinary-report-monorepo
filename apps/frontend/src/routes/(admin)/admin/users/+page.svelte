<script lang="ts">
	import { Download } from '@lucide/svelte';
	import type { AdminUserOutputDto } from 'client';

	import { AdminUserOutputDtoRolesEnum, ListUsersParamsSortEnum } from 'client';

	import { page } from '$app/state';
	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import UserChip from '#components/admin/user-chip.svelte';
	import { api } from '#lib/api.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';

	const SORTS: Sort[] = [
		{ value: ListUsersParamsSortEnum.CreatedAtDesc, name: 'Newest first' },
		{ value: ListUsersParamsSortEnum.CreatedAtAsc, name: 'Oldest first' },
		{ value: ListUsersParamsSortEnum.FirstNameAsc, name: 'Name A–Z' },
		{ value: ListUsersParamsSortEnum.FirstNameDesc, name: 'Name Z–A' }
	];
	const FILTERS: Filter[] = [
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Name, e-mail or phone…' },
		{ key: 'isMarkedForDeletion', name: 'Marked for deletion', type: 'toggle' }
	];
	const COLUMNS: Column<AdminUserOutputDto>[] = [
		{
			type: 'component',
			name: 'Name',
			component: UserChip,
			props: (row) => ({ user: row, sm: true }),
			sort: {
				asc: ListUsersParamsSortEnum.FirstNameAsc,
				desc: ListUsersParamsSortEnum.FirstNameDesc
			}
		},
		{
			type: 'value',
			name: 'Email',
			truncate: 30,
			value: (row) => row.email ?? ''
		},
		{
			type: 'value',
			name: 'Mobile',
			class: 'tabular-nums',
			value: (row) => row.mobileNumber ?? ''
		},
		{
			// Everyone is a `user`; only what sets an account apart is worth a cell.
			type: 'value',
			name: 'Roles',
			value: (row) =>
				row.roles.filter((role) => role !== AdminUserOutputDtoRolesEnum.User).join(', ')
		},
		{
			type: 'date',
			name: 'Joined',
			relative: true,
			value: (row) => row.createdAt,
			sort: {
				asc: ListUsersParamsSortEnum.CreatedAtAsc,
				desc: ListUsersParamsSortEnum.CreatedAtDesc
			}
		}
	];

	const filters = { sort: ListUsersParamsSortEnum.CreatedAtDesc, q: undefined };

	// The export is the whole user base, not the page in view.
	const exportAction = createAction(
		() => api.admin.exportUsersCsv({}, { format: 'blob' }) as Promise<Blob>,
		{
			onSuccess: (blob) => {
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
				a.click();
				URL.revokeObjectURL(url);
			},
			successNotification: { title: 'Users exported', text: 'The CSV is in your downloads' }
		}
	);
</script>

<AdminListPage>
	{#snippet actions()}
		<Button
			variant="outline"
			size="sm"
			icon={Download}
			loading={exportAction.executing}
			onclick={() => exportAction.execute()}>
			Export CSV
		</Button>
	{/snippet}

	<PaginatedDataTable
		syncWithSearchParams
		{filters}
		api={api.admin.listUsers}
		noun="users"
		availableFilters={FILTERS}
		availableSorts={SORTS}
		columns={COLUMNS}
		rowHref={(row) => `/admin/users/${row.id}`} />
</AdminListPage>
