<script lang="ts">
	import {
		type AdminCreatorRowOutputDto,
		ListCreatorsParamsPlatformEnum as Platform,
		ListCreatorsParamsSortEnum as SortBy
	} from 'client';

	import CreatorCell from './CreatorCell.svelte';

	import { api } from '#lib/api.js';
	import { compact, currentMonth, monthLabel } from '#lib/culinary.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// The Social page's "Creators" tab: who posted about the city's food in a month, each person
	// once over all their accounts (their TikTok and Instagram are one creator). Venues' own
	// accounts are left out unless asked.
	interface Props {
		cityId?: string;
		month: string;
	}

	let { cityId, month }: Props = $props();

	const SORTS: Sort[] = [
		{ value: SortBy.ViewsDesc, name: 'Most views' },
		{ value: SortBy.PostsDesc, name: 'Most posts' },
		{ value: SortBy.FollowersDesc, name: 'Most followers' },
		{ value: SortBy.BrandsDesc, name: 'Most brands named' },
		{ value: SortBy.NameAsc, name: 'Name A–Z' }
	];
	const FILTERS: Filter[] = [
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Name or handle…' },
		{
			key: 'platform',
			name: 'Platform',
			type: 'select',
			options: [
				{ name: 'TikTok', value: Platform.Tiktok },
				{ name: 'Instagram', value: Platform.Instagram }
			]
		},
		{ key: 'includeOwn', name: "Venues' own accounts too", type: 'toggle' }
	];
	const filters = $derived({ sort: SortBy.ViewsDesc, month, ...(cityId && { cityId }), q: undefined });

	const faint = (n: number) => (n ? n : { value: '—', class: 'text-faint' });
	const COLUMNS: Column<AdminCreatorRowOutputDto>[] = [
		{
			type: 'component',
			name: 'Creator',
			component: CreatorCell,
			props: (row) => ({ row }),
			sort: { asc: SortBy.NameAsc, desc: SortBy.NameDesc }
		},
		{
			type: 'value',
			name: 'Followers',
			numeric: true,
			value: (row) => (row.followers !== undefined ? compact(row.followers) : { value: '—', class: 'text-faint' }),
			sort: { asc: SortBy.FollowersAsc, desc: SortBy.FollowersDesc }
		},
		{
			type: 'value',
			name: 'Posts',
			numeric: true,
			value: (row) => row.month.posts,
			sort: { asc: SortBy.PostsAsc, desc: SortBy.PostsDesc }
		},
		{
			type: 'value',
			name: 'Views',
			numeric: true,
			value: (row) => compact(row.month.views),
			sort: { asc: SortBy.ViewsAsc, desc: SortBy.ViewsDesc }
		},
		{
			type: 'value',
			name: 'Brands',
			label: 'Brands named',
			numeric: true,
			value: (row) => faint(row.month.brands),
			sort: { asc: SortBy.BrandsAsc, desc: SortBy.BrandsDesc }
		},
		{ type: 'count', name: 'Paid', label: 'Paid or gifted', tone: 'warning', value: (row) => row.month.paid },
		{ type: 'date', name: 'Last post', format: 'date', value: (row) => row.month.lastPostedAt }
	];
</script>

{#if month === currentMonth()}
	<p class="ink-strip m-0 text-sm">{monthLabel(month)} is still going: these are the posts stored so far.</p>
{/if}
<PaginatedDataTable
	syncWithSearchParams
	{filters}
	api={api.admin.listCreators}
	noun="creators"
	availableFilters={FILTERS}
	availableSorts={SORTS}
	columns={COLUMNS}
	limit={50}
	emptyDescription={`Nobody's posts were stored for ${monthLabel(month)}. Pick another month.`}
	rowHref={(row) => `/admin/creators/${row.id}`} />
