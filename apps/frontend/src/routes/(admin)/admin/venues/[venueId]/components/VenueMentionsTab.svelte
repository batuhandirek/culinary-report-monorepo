<script lang="ts">
	import { Pencil } from '@lucide/svelte';
	import type { AdminMentionWithPostOutputDto, AdminVenueOutputDto } from 'client';

	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { api } from '#lib/api.js';
	import {
		compact,
		monthLabel,
		PLATFORM_LABELS,
		recentMonths,
		sentimentVariant
	} from '#lib/culinary.js';
	import type {
		Column,
		Filter,
		PaginatedDataTableAction
	} from '#ui/components/paginated-data-table/index.js';
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
	const COLUMNS: Column<AdminMentionWithPostOutputDto>[] = [
		{ type: 'date', name: 'Posted', format: 'date', value: (row) => row.post.postedAt },
		{
			type: 'value',
			name: 'Platform',
			value: (row) => PLATFORM_LABELS[row.post.platform] ?? row.post.platform
		},
		{
			type: 'link',
			name: 'Creator',
			truncate: 22,
			href: (row) => `/admin/posts/${row.post.id}`,
			value: (row) => `@${row.post.author ?? '—'}`
		},
		{ type: 'value', name: 'What they said', truncate: 70, value: (row) => row.summary },
		{
			type: 'badge',
			name: 'Sentiment',
			value: (row) => row.sentiment,
			variant: (row) => sentimentVariant(row.sentiment)
		},
		{ type: 'value', name: 'Views', numeric: true, value: (row) => compact(row.post.views) },
		{
			type: 'value',
			name: 'Matched',
			value: (row) => (row.venue ? (row.matchMethod ?? '') : `${row.matchMethod ?? ''} · brand`)
		}
	];

	// A wrong match is relinked, unlinked or ignored here; the table refetches after
	let editing = $state<AdminMentionWithPostOutputDto | null>(null);
	let editOpen = $state(false);
	let version = $state(0);
	const ACTIONS: PaginatedDataTableAction<AdminMentionWithPostOutputDto>[] = [
		{
			icon: Pencil,
			label: 'Change venue',
			onClick: (row) => {
				editing = row;
				editOpen = true;
			}
		}
	];
</script>

<PaginatedDataTable
	filters={{ venueId: venue.id }}
	api={api.admin.listMentions}
	noun="mentions"
	availableFilters={FILTERS}
	columns={COLUMNS}
	actions={ACTIONS}
	key={version}
	rowHref={(row) => `/admin/posts/${row.post.id}`} />

{#if editing}
	<ChangeMentionVenueDialog mention={editing} bind:active={editOpen} onChanged={() => version++} />
{/if}
