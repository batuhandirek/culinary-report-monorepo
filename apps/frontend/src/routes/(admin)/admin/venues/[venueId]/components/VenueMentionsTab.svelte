<script lang="ts">
	import { Pencil } from '@lucide/svelte';
	import type { AdminMentionWithPostOutputDto, AdminVenueOutputDto } from 'client';

	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import { mentionPostRow, postColumns } from '#components/admin/posts/post-columns.js';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel, recentMonths } from '#lib/culinary.js';
	import { MATCH_METHOD_LABELS } from '#lib/digestion.js';
	import type { Column, Filter, PaginatedDataTableAction } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// Every post naming the place, as every post table shows one (`post-columns.ts`): one line
	// each, opening in place on the post and what the pipeline made of it, with how it was matched.
	// A wrong match is fixed here.
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	type Row = AdminMentionWithPostOutputDto;
	const FILTERS: Filter[] = [
		{
			key: 'month',
			name: 'Month',
			type: 'select',
			options: recentMonths(12).map((m) => ({ name: monthLabel(m), value: m }))
		}
	];
	const COLUMNS: Column<Row>[] = postColumns<Row>(mentionPostRow, {
		text: 'What they said',
		empty: 'nothing kept',
		end: [
			{
				type: 'value',
				name: 'Matched',
				value: (row) => ({
					value: [row.matchMethod && (MATCH_METHOD_LABELS[row.matchMethod] ?? row.matchMethod), !row.venue && 'the brand']
						.filter(Boolean)
						.join(' · '),
					class: 'text-muted-foreground'
				})
			}
		]
	});

	// A wrong match is relinked, unlinked or ignored here; the table refetches after
	let editing = $state<Row | null>(null);
	let editOpen = $state(false);
	let version = $state(0);
	const ACTIONS: PaginatedDataTableAction<Row>[] = [
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

{#snippet details(row: Row)}
	<DigestionDetail postId={row.post.id} />
{/snippet}

<PaginatedDataTable
	filters={{ venueId: venue.id }}
	api={api.admin.listMentions}
	noun="posts"
	availableFilters={FILTERS}
	columns={COLUMNS}
	actions={ACTIONS}
	key={version}
	limit={25}
	expand={details}
	rowKey={(row) => String(row.id)}
	emptyDescription={`No post named ${venue.name} yet.`} />

{#if editing}
	<ChangeMentionVenueDialog mention={editing} bind:active={editOpen} onChanged={() => version++} />
{/if}
