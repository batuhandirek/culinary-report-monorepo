<script lang="ts">
	import { Radar } from '@lucide/svelte';
	import type { AdminSocialPostListItemOutputDto } from 'client';

	import { ListPostsParamsPlatformEnum, ListPostsParamsSkipReasonEnum, ListPostsParamsSortEnum } from 'client';

	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import { postColumns } from '#components/admin/posts/post-columns.js';
	import PostBrandsCell from '#components/admin/posts/PostBrandsCell.svelte';
	import { cityFilter } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { monthLabel, recentMonths, SKIP_REASON_LABELS } from '#lib/culinary.js';
	import { findLabel } from '#lib/post-sources.js';
	import { tallyOf } from '#lib/statements.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	const SORTS: Sort[] = [
		{ value: ListPostsParamsSortEnum.PostedAtDesc, name: 'Newest first' },
		{ value: ListPostsParamsSortEnum.ViewsDesc, name: 'Most viewed' },
		{ value: ListPostsParamsSortEnum.PostedAtAsc, name: 'Oldest first' }
	];
	adminCitiesStore.load();
	const FILTERS: Filter[] = $derived([
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Caption, creator or tagged place…' },
		{ key: 'hashtag', name: 'Hashtag', type: 'text', placeholder: '#berlinfood' },
		cityFilter(adminCitiesStore.list),
		{
			key: 'platform',
			name: 'Platform',
			type: 'select',
			options: [
				{ name: 'TikTok', value: ListPostsParamsPlatformEnum.Tiktok },
				{ name: 'Instagram', value: ListPostsParamsPlatformEnum.Instagram },
				{ name: 'Blog', value: ListPostsParamsPlatformEnum.Blog }
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
		{ key: 'unmatchedOnly', name: 'Unmatched', type: 'toggle' },
		// A matched place a new read no longer names: link it again or mark it not a venue
		{ key: 'unconfirmedOnly', name: 'Unconfirmed match', type: 'toggle' },
		{
			key: 'skipReason',
			name: 'Not digested',
			type: 'select',
			options: Object.values(ListPostsParamsSkipReasonEnum).map((value) => ({ name: SKIP_REASON_LABELS[value] ?? value, value }))
		}
	]);

	type Row = AdminSocialPostListItemOutputDto;
	const statusOf = (row: Row) => (row.skipReason ? 'skipped' : row.analysedAt ? 'digested' : 'unread');
	const COLUMNS: Column<Row>[] = postColumns<Row>(
		(row) => ({
			postId: row.id,
			postedAt: row.postedAt,
			platform: row.platform,
			author: row.author ?? undefined,
			authorHref: row.account ? `/admin/creators/${row.account.creator.id}` : undefined,
			ownAccount: !!row.account?.brand,
			text: row.text ?? undefined,
			views: row.views,
			status: statusOf(row),
			skipReason: row.skipReason ?? undefined,
			sentiments: tallyOf(row.mentions.flatMap((m) => m.statements ?? []))
		}),
		{
			sort: {
				posted: { asc: ListPostsParamsSortEnum.PostedAtAsc, desc: ListPostsParamsSortEnum.PostedAtDesc },
				views: { asc: ListPostsParamsSortEnum.ViewsAsc, desc: ListPostsParamsSortEnum.ViewsDesc }
			},
			afterText: [
				{
					type: 'component',
					name: 'Names',
					label: 'Brands named',
					component: PostBrandsCell,
					props: (row) => ({ mentions: row.mentions })
				}
			],
			end: [{ type: 'snippet', name: 'Found by', label: '', snippet: foundCell }]
		}
	);

	const filters = { sort: ListPostsParamsSortEnum.PostedAtDesc, q: undefined };
</script>

<!-- The Social page's "Posts" tab: everything we listened to, and the brands each post names. A
     row is every post table's row (`post-columns.ts`), opening in place on the post and what the
     pipeline made of it. -->

{#snippet foundCell(row: Row)}
	{#if row.foundBy.length}
		<Tooltip text={`Found by ${row.foundBy.map(findLabel).join(', ')}`}><Radar class="text-muted-foreground size-3.5" aria-label="How we found it" /></Tooltip>
	{/if}
{/snippet}

{#snippet details(row: Row)}
	<DigestionDetail postId={row.id} />
{/snippet}

<PaginatedDataTable
	syncWithSearchParams
	{filters}
	api={api.admin.listPosts}
	noun="posts"
	availableFilters={FILTERS}
	availableSorts={SORTS}
	columns={COLUMNS}
	expand={details}
	rowKey={(row) => row.id}>
	{#snippet toolbar()}
		<Button
			size="sm"
			variant="outline"
			href={`/admin/posts?unmatchedOnly=true&sort=${ListPostsParamsSortEnum.ViewsDesc}`}>
			Unmatched, most viewed
		</Button>
	{/snippet}
</PaginatedDataTable>
