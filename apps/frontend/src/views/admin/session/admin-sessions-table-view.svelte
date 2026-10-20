<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import type { AdminListSessionsInputDto, AdminSessionOutputDto } from 'client';
	import { nanoid } from 'nanoid';

	import {
		AdminListSessionsInputDtoPlatformEnum,
		AdminListSessionsInputDtoSortEnum
	} from 'client';

	import UserChip from '#components/admin/user-chip.svelte';
	import { api } from '#lib/api.js';
	import type {
		Column,
		Filter,
		PaginatedDataTableAction,
		Sort
	} from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';

	interface Props {
		filters?: Omit<AdminListSessionsInputDto, 'page' | 'size'>;
		hiddenColumns?: string[];
	}

	let { filters = $bindable({}), hiddenColumns = [] }: Props = $props();

	const SORTS: Sort[] = [
		{ value: AdminListSessionsInputDtoSortEnum.LastSeenAtDesc, name: 'Last seen' },
		{ value: AdminListSessionsInputDtoSortEnum.CreatedAtDesc, name: 'Newest first' },
		{ value: AdminListSessionsInputDtoSortEnum.CreatedAtAsc, name: 'Oldest first' },
		{ value: AdminListSessionsInputDtoSortEnum.ExpiresAtAsc, name: 'Expiring soonest' }
	];

	const FILTERS: Filter[] = [
		{
			key: 'platform',
			name: 'Platform',
			type: 'select',
			options: [
				{ name: 'Web', value: AdminListSessionsInputDtoPlatformEnum.Web },
				{ name: 'Android', value: AdminListSessionsInputDtoPlatformEnum.Android },
				{ name: 'iOS', value: AdminListSessionsInputDtoPlatformEnum.Ios }
			]
		},
		{ key: 'activeOnly', name: 'Active only', type: 'toggle' }
	];

	const COLUMNS: Column<AdminSessionOutputDto>[] = [
		{
			type: 'component',
			name: 'User',
			component: UserChip,
			if: (row) => !!row.user,
			props: (row) => ({ user: row.user, sm: true })
		},
		{ type: 'value', name: 'Platform', value: (row) => row.platform ?? '' },
		{
			type: 'value',
			name: 'OS / Browser',
			truncate: 28,
			value: (row) =>
				[row.visitorInfo?.os?.name, row.visitorInfo?.browser?.name]
					.filter(Boolean)
					.join(' / ')
		},
		{
			type: 'value',
			name: 'IP / Country',
			truncate: 26,
			class: 'tabular-nums',
			value: (row) =>
				[row.visitorInfo?.ip, row.visitorInfo?.countryCode].filter(Boolean).join(' · ')
		},
		{
			type: 'date',
			name: 'Last Seen',
			label: 'Last seen',
			relative: true,
			value: (row) => row.lastSeenAt,
			sort: { desc: AdminListSessionsInputDtoSortEnum.LastSeenAtDesc }
		},
		{
			type: 'date',
			name: 'Created',
			label: 'Signed in',
			value: (row) => row.createdAt,
			sort: {
				asc: AdminListSessionsInputDtoSortEnum.CreatedAtAsc,
				desc: AdminListSessionsInputDtoSortEnum.CreatedAtDesc
			}
		},
		{
			type: 'date',
			name: 'Expires',
			value: (row) => row.expiresAt,
			sort: { asc: AdminListSessionsInputDtoSortEnum.ExpiresAtAsc }
		}
	];

	let refreshKey = $state(nanoid());
	let pendingDeleteId = $state<string | null>(null);
	let confirmOpen = $state(false);

	// Closing the dialog (cancel / outside click / escape) clears the pending row.
	$effect(() => {
		if (!confirmOpen) pendingDeleteId = null;
	});

	const deleteAction = createAction((id: string) => api.admin.deleteUserSession(id), {
		onSuccess: () => {
			confirmOpen = false;
			refreshKey = nanoid();
		},
		successNotification: { title: 'Session revoked', text: 'The session has been deleted' }
	});

	const ACTIONS: PaginatedDataTableAction<AdminSessionOutputDto>[] = [
		{
			label: 'Revoke session',
			icon: Trash2,
			class: 'hover:text-destructive',
			onClick: (row) => {
				pendingDeleteId = row.id;
				confirmOpen = true;
			}
		}
	];
</script>

<PopConfirm
	bind:open={confirmOpen}
	title="Revoke session"
	description="Are you sure you want to delete this session? The user will be signed out on that device."
	confirmText="Revoke"
	onConfirm={() => pendingDeleteId && deleteAction.execute(pendingDeleteId)} />

<div class="flex min-h-0 w-full flex-1 flex-col">
	<PaginatedDataTable
		key={refreshKey}
		filters={{
			...filters,
			sort: filters.sort ?? AdminListSessionsInputDtoSortEnum.LastSeenAtDesc
		}}
		api={api.admin.listUserSessions}
		syncWithSearchParams
		limit={15}
		noun="sessions"
		availableFilters={FILTERS}
		availableSorts={SORTS}
		columns={COLUMNS.filter((c) => !hiddenColumns.includes(c.name))}
		actions={ACTIONS} />
</div>
