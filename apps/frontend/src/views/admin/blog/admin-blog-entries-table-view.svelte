<script lang="ts">
	import type { AdminBlogEntryListItem, AdminListBlogEntriesInputDto } from 'client';

	import {
		AdminListBlogEntriesInputDtoSortEnum,
		AdminListBlogEntriesInputDtoStatesEnum
	} from 'client';

	import { stateVariant } from '#components/admin/admin-format.js';
	import { api } from '#lib/api.js';
	import { enumToName } from '#lib/util.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	interface Props {
		filters?: Omit<AdminListBlogEntriesInputDto, 'page' | 'size'>;
	}

	let { filters = $bindable({}) }: Props = $props();

	const SORTS: Sort[] = [
		{ value: AdminListBlogEntriesInputDtoSortEnum.CreatedAtDESC, name: 'Newest first' },
		{ value: AdminListBlogEntriesInputDtoSortEnum.CreatedAtASC, name: 'Oldest first' },
		{ value: AdminListBlogEntriesInputDtoSortEnum.PublishedAtDESC, name: 'Recently published' },
		{ value: AdminListBlogEntriesInputDtoSortEnum.ViewCountDESC, name: 'Most viewed' },
		{ value: AdminListBlogEntriesInputDtoSortEnum.TitleASC, name: 'Title A–Z' }
	];

	const FILTERS: Filter[] = [
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Title…' },
		{
			key: 'states',
			name: 'State',
			type: 'multiSelect',
			options: Object.entries(AdminListBlogEntriesInputDtoStatesEnum).map(([key, val]) => ({
				name: enumToName(val),
				value: key
			}))
		}
	];

	const COLUMNS: Column<AdminBlogEntryListItem>[] = [
		{
			type: 'value',
			name: 'Title',
			truncate: 48,
			class: 'font-medium',
			value: (row) => row.title,
			sort: { asc: AdminListBlogEntriesInputDtoSortEnum.TitleASC }
		},
		{
			type: 'badge',
			name: 'State',
			value: (row) => enumToName(row.state),
			variant: (row) => stateVariant(row.state)
		},
		{ type: 'value', name: 'Author', value: (row) => row.author?.publicName ?? '' },
		{
			type: 'value',
			name: 'Tags',
			truncate: 24,
			value: (row) => (row.tags ?? []).map((t) => t.name).join(', ')
		},
		{
			type: 'count',
			name: 'Views',
			value: (row) => row.viewCount ?? 0,
			sort: { desc: AdminListBlogEntriesInputDtoSortEnum.ViewCountDESC }
		},
		{
			type: 'date',
			name: 'Published At',
			label: 'Published',
			value: (row) => row.publishedAt,
			sort: { desc: AdminListBlogEntriesInputDtoSortEnum.PublishedAtDESC }
		},
		{
			type: 'date',
			name: 'Created At',
			label: 'Created',
			value: (row) => row.createdAt,
			sort: {
				asc: AdminListBlogEntriesInputDtoSortEnum.CreatedAtASC,
				desc: AdminListBlogEntriesInputDtoSortEnum.CreatedAtDESC
			}
		}
	];

	const localFilters: Partial<AdminListBlogEntriesInputDto> = {
		sort: AdminListBlogEntriesInputDtoSortEnum.CreatedAtDESC,
		q: undefined,
		states: []
	};

	let activeFilters = $derived({ ...filters, ...localFilters });
</script>

<div class="flex min-h-0 w-full flex-1 flex-col">
	<PaginatedDataTable
		filters={activeFilters}
		api={api.admin.listEntries}
		limit={15}
		noun="articles"
		emptyDescription="Write the first one with “New article”."
		availableFilters={FILTERS}
		availableSorts={SORTS}
		columns={COLUMNS}
		rowHref={(row) => `/admin/blog/${row.id}`}
		syncWithSearchParams />
</div>
