<script lang="ts">
	import { Pencil } from '@lucide/svelte';
	import type { AdminBrandOutputDto, AdminMentionWithPostOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DateRangeFilter from '#components/admin/DateRangeFilter.svelte';
	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import { mentionPostRow, postColumns } from '#components/admin/posts/post-columns.js';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { api } from '#lib/api.js';
	import { MATCH_METHOD_LABELS } from '#lib/digestion.js';
	import type { Column, PaginatedDataTableAction } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// Every post naming the brand (any branch, or the brand alone), as every post table shows one
	// (`post-columns.ts`): one line each, opening in place on the post and what the pipeline made of it. The
	// dates are the table's own filter (`?from=&to=`, every day without). A wrong match is fixed here.
	interface Props {
		brand: AdminBrandOutputDto;
	}

	let { brand }: Props = $props();
	const chain = $derived(brand.branches.length > 1);

	const isDay = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
	const from = $derived(isDay(page.url.searchParams.get('from')));
	const to = $derived(isDay(page.url.searchParams.get('to')));
	const setRange = (range: { from?: string; to?: string }) => {
		const url = new URL(page.url.href);
		for (const key of ['from', 'to'] as const) {
			if (range[key]) url.searchParams.set(key, range[key]!);
			else url.searchParams.delete(key);
		}
		goto(url, { replace: true, reset: false });
	};

	type Row = AdminMentionWithPostOutputDto;
	// A chain's branches share its name: a branch is its street (or district)
	const branchLabel = (row: Row) => {
		if (!row.venue) return 'the brand';
		const branch = brand.branches.find((b) => b.id === row.venue!.id);
		return branch?.street ?? row.venue.district ?? row.venue.name;
	};
	const matchLabel = (row: Row) =>
		row.matchMethod ? `Matched: ${MATCH_METHOD_LABELS[row.matchMethod] ?? row.matchMethod}` : 'Not matched yet';
	const COLUMNS: Column<Row>[] = $derived(
		postColumns<Row>(mentionPostRow, {
			text: 'What they said',
			empty: 'nothing kept',
			afterCreator: chain ? [{ type: 'snippet', name: 'Branch', class: 'max-w-[12rem]', snippet: branchCell }] : []
		})
	);

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

	const listMentions = (query: { page: number; size: number }) =>
		api.admin.listMentions({
			page: query.page,
			size: query.size,
			brandId: brand.id,
			...(from && { from }),
			...(to && { to })
		});
</script>

{#snippet branchCell(row: Row)}
	<Tooltip text={matchLabel(row)} class="max-w-full">
		<span class={['block truncate', !row.venue && 'text-muted-foreground']}>{branchLabel(row)}</span>
	</Tooltip>
{/snippet}

{#snippet details(row: Row)}
	<DigestionDetail postId={row.post.id} />
{/snippet}

{#snippet toolbar()}
	<DateRangeFilter {from} {to} onChange={setRange} />
{/snippet}

<PaginatedDataTable
	api={listMentions}
	noun="posts"
	columns={COLUMNS}
	actions={ACTIONS}
	key={`${version}:${from}:${to}`}
	limit={25}
	{toolbar}
	expand={details}
	rowKey={(row) => String(row.id)}
	emptyDescription={from || to ? `No post named ${brand.name} in these dates.` : `No post named ${brand.name} yet.`} />

{#if editing}
	<ChangeMentionVenueDialog mention={editing} bind:active={editOpen} onChanged={() => version++} />
{/if}
