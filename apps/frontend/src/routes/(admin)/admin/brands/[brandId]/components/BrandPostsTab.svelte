<script lang="ts">
	import { Pencil } from '@lucide/svelte';
	import type { AdminBrandOutputDto, AdminMentionWithPostOutputDto } from 'client';

	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { api } from '#lib/api.js';
	import { compact, monthLabel, PLATFORM_LABELS, sentimentVariant } from '#lib/culinary.js';
	import type {
		Column,
		PaginatedDataTableAction
	} from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// Every post naming the brand: any branch, or the brand alone. A wrong match is fixed here.
	interface Props {
		brand: AdminBrandOutputDto;
		month: string;
	}

	let { brand, month }: Props = $props();
	const chain = $derived(brand.branches.length > 1);

	// The page's month, or every month
	const VIEWS = [
		{ value: 'month', label: monthLabel(month) },
		{ value: 'all', label: 'All months' }
	];
	let view = $state('month');
	const COLUMNS: Column<AdminMentionWithPostOutputDto>[] = $derived([
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
		...(chain
			? [
					{
						type: 'value' as const,
						name: 'Branch',
						truncate: 26,
						value: (row: AdminMentionWithPostOutputDto) =>
							row.venue?.name ?? { value: 'the brand', class: 'text-muted-foreground' }
					}
				]
			: []),
		{ type: 'value', name: 'What they said', truncate: 70, value: (row) => row.summary },
		{
			type: 'badge',
			name: 'Sentiment',
			value: (row) => row.sentiment,
			variant: (row) => sentimentVariant(row.sentiment)
		},
		{ type: 'value', name: 'Views', numeric: true, value: (row) => compact(row.post.views) },
		{ type: 'value', name: 'Matched', value: (row) => row.matchMethod ?? '' }
	]);

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

	const listMentions = (query: { page: number; size: number }) =>
		api.admin.listMentions({
			page: query.page,
			size: query.size,
			brandId: brand.id,
			...(view === 'month' && { month })
		});
</script>

<div class="flex flex-col gap-3">
	<AdminDetailTabs tabs={VIEWS} bind:value={view} param="posts" variant="pills" keeps={['tab', 'month', 'cityId']} />
	<PaginatedDataTable
		api={listMentions}
		noun="mentions"
		columns={COLUMNS}
		actions={ACTIONS}
		key={`${version}:${month}:${view}`}
		emptyDescription={view === 'month'
			? `No post named ${brand.name} in ${monthLabel(month)}. Pick another month above, or all months.`
			: `No post named ${brand.name} yet.`}
		rowHref={(row) => `/admin/posts/${row.post.id}`} />
</div>

{#if editing}
	<ChangeMentionVenueDialog mention={editing} bind:active={editOpen} onChanged={() => version++} />
{/if}
