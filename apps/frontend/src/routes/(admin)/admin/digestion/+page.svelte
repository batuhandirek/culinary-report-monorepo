<script lang="ts">
	import type { AdminDigestionRowOutputDto } from 'client';

	import {
		ListDigestionParamsKindEnum,
		ListDigestionParamsPlatformEnum,
		ListDigestionParamsSkipReasonEnum,
		ListDigestionParamsStatusEnum
	} from 'client';

	import DigestionDetail from './components/DigestionDetail.svelte';
	import TallyCell from './components/TallyCell.svelte';

	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import { cityFilter } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { authorLabel, SKIP_REASON_LABELS } from '#lib/culinary.js';
	import { digestionStatusLabel, digestionStatusVariant, SOURCE_PLATFORM_LABELS } from '#lib/digestion.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// Every review and post, newest first, and what the ingestion pipeline turned it into: a row
	// opens in place on the source's full text and each step's result (the gate, agent A's places
	// and claims, agent B's parts of each claim).
	adminCitiesStore.load();
	const FILTERS: Filter[] = $derived([
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Words in a review, caption, transcript or article…' },
		{
			key: 'kind',
			name: 'Source',
			type: 'select',
			options: [
				{ name: 'Reviews', value: ListDigestionParamsKindEnum.Review },
				{ name: 'Posts', value: ListDigestionParamsKindEnum.Post }
			]
		},
		{
			key: 'platform',
			name: 'Platform',
			type: 'select',
			options: [
				ListDigestionParamsPlatformEnum.Google,
				ListDigestionParamsPlatformEnum.Tripadvisor,
				ListDigestionParamsPlatformEnum.Tiktok,
				ListDigestionParamsPlatformEnum.Instagram,
				ListDigestionParamsPlatformEnum.Blog
			].map((value) => ({ name: SOURCE_PLATFORM_LABELS[value] ?? value, value }))
		},
		cityFilter(adminCitiesStore.list),
		{
			key: 'status',
			name: 'Status',
			type: 'select',
			options: [
				{ name: 'Digested', value: ListDigestionParamsStatusEnum.Digested },
				{ name: 'Skipped by the gate', value: ListDigestionParamsStatusEnum.Skipped },
				{ name: 'Not read yet', value: ListDigestionParamsStatusEnum.Unread }
			]
		},
		{
			key: 'skipReason',
			name: 'Skipped because',
			type: 'select',
			options: Object.values(ListDigestionParamsSkipReasonEnum).map((value) => ({
				name: SKIP_REASON_LABELS[value] ?? value,
				value
			}))
		}
	]);

	type Row = AdminDigestionRowOutputDto;
	const dateOf = (row: Row) => row.post?.postedAt ?? row.review?.publishedAt;
	const sourceLabel = (row: Row) =>
		row.review
			? `${SOURCE_PLATFORM_LABELS[row.review.platform] ?? row.review.platform} review${row.review.stars ? ` · ${row.review.stars}★` : ''}`
			: row.post
				? (SOURCE_PLATFORM_LABELS[row.post.platform] ?? row.post.platform)
				: '';

	const COLUMNS: Column<Row>[] = [
		{ type: 'date', name: 'Said', format: 'date', value: dateOf },
		{
			type: 'badge',
			name: 'Source',
			value: sourceLabel,
			variant: (row) => (row.review ? 'secondary' : 'quiet')
		},
		{
			type: 'link',
			name: 'From',
			truncate: 26,
			// A review's venue; a post's author, opening the post's page
			href: (row) => (row.review ? `/admin/venues/${row.review.venue.id}` : `/admin/posts/${row.post!.id}`),
			value: (row) =>
				row.review ? row.review.venue.name : authorLabel(row.post!.platform, row.post!.author)
		},
		{
			type: 'value',
			name: 'Text',
			truncate: 70,
			value: (row) => row.excerpt ?? { value: 'no text', class: 'text-faint italic' }
		},
		{
			type: 'badge',
			name: 'Status',
			value: (row) => digestionStatusLabel(row.status, row.post?.skipReason),
			variant: (row) => digestionStatusVariant(row.status)
		},
		{ type: 'count', name: 'Places', if: (row) => row.kind === 'post', value: (row) => row.places },
		{ type: 'count', name: 'Claims', value: (row) => row.claims },
		{
			type: 'component',
			name: 'Sentiment',
			component: TallyCell,
			props: (row) => ({ sentiments: row.sentiments })
		}
	];
</script>

{#snippet details(row: Row)}
	<DigestionDetail {row} />
{/snippet}

<AdminListPage>
	<PaginatedDataTable
		syncWithSearchParams
		api={api.admin.listDigestion}
		noun="sources"
		availableFilters={FILTERS}
		columns={COLUMNS}
		rowKey={(row) => `${row.kind}:${row.post?.id ?? row.review?.id}`}
		expand={details} />
</AdminListPage>
