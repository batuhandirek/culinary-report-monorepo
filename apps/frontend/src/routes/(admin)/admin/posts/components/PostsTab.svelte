<script lang="ts">
	import type { AdminSocialPostListItemOutputDto } from 'client';

	import { ListPostsParamsPlatformEnum, ListPostsParamsSortEnum } from 'client';

	import PostBrandsCell from './PostBrandsCell.svelte';

	import { cityFilter } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { compact, monthLabel, PLATFORM_LABELS, recentMonths } from '#lib/culinary.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	const SORTS: Sort[] = [
		{ value: ListPostsParamsSortEnum.PostedAtDesc, name: 'Newest first' },
		{ value: ListPostsParamsSortEnum.ViewsDesc, name: 'Most viewed' },
		{ value: ListPostsParamsSortEnum.PostedAtAsc, name: 'Oldest first' }
	];
	adminCitiesStore.load();
	const FILTERS: Filter[] = $derived([
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Caption, creator or tagged place…' },
		cityFilter(adminCitiesStore.list),
		{
			key: 'platform',
			name: 'Platform',
			type: 'select',
			options: [
				{ name: 'TikTok', value: ListPostsParamsPlatformEnum.Tiktok },
				{ name: 'Instagram', value: ListPostsParamsPlatformEnum.Instagram }
			]
		},
		{
			key: 'month',
			name: 'Month',
			type: 'select',
			options: recentMonths(12).map((m) => ({ name: monthLabel(m), value: m }))
		},
		{ key: 'matchedOnly', name: 'Mentions a known venue', type: 'toggle' },
		// Names nothing matched: open the post and link the mention by hand
		{ key: 'unmatchedOnly', name: 'Unmatched', type: 'toggle' }
	]);


	const COLUMNS: Column<AdminSocialPostListItemOutputDto>[] = [
		{
			type: 'date',
			name: 'Posted',
			format: 'date',
			value: (row) => row.postedAt,
			sort: { asc: ListPostsParamsSortEnum.PostedAtAsc, desc: ListPostsParamsSortEnum.PostedAtDesc }
		},
		{ type: 'value', name: 'Platform', value: (row) => PLATFORM_LABELS[row.platform] ?? row.platform },
		{
			type: 'link',
			name: 'Creator',
			truncate: 22,
			href: (row) => (row.account ? `/admin/creators/${row.account.creator.id}` : ''),
			value: (row) =>
				row.account?.brand
					? { value: `@${row.author}`, class: 'text-muted-foreground' }
					: row.author
						? `@${row.author}`
						: ''
		},
		{ type: 'value', name: 'Caption', truncate: 60, value: (row) => row.text ?? '' },
		{
			type: 'component',
			name: 'Names',
			label: 'Brands named',
			component: PostBrandsCell,
			props: (row) => ({ mentions: row.mentions })
		},
		{
			type: 'value',
			name: 'Views',
			numeric: true,
			value: (row) => compact(row.views),
			sort: { asc: ListPostsParamsSortEnum.ViewsAsc, desc: ListPostsParamsSortEnum.ViewsDesc }
		},
		{ type: 'value', name: 'Found by', truncate: 24, value: (row) => row.source ?? '' }
	];

	const filters = { sort: ListPostsParamsSortEnum.PostedAtDesc, q: undefined };
</script>

<!-- The Social page's "Posts" tab: everything we listened to, and the brands each post names. -->

<PaginatedDataTable
	syncWithSearchParams
	{filters}
	api={api.admin.listPosts}
	noun="posts"
	availableFilters={FILTERS}
	availableSorts={SORTS}
	columns={COLUMNS}
	rowHref={(row) => `/admin/posts/${row.id}`}>
	{#snippet toolbar()}
		<Button
			size="sm"
			variant="outline"
			href={`/admin/posts?unmatchedOnly=true&sort=${ListPostsParamsSortEnum.ViewsDesc}`}>
			Unmatched, most viewed
		</Button>
	{/snippet}
</PaginatedDataTable>
