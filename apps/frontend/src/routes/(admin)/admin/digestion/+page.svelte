<script lang="ts">
	import { Store } from '@lucide/svelte';
	import type { AdminDigestionRowOutputDto } from 'client';

	import {
		ListDigestionParamsKindEnum,
		ListDigestionParamsPlatformEnum,
		ListDigestionParamsSkipReasonEnum,
		ListDigestionParamsStatusEnum
	} from 'client';

	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';
	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import DigestionStatusIcon from '#components/admin/digestion/DigestionStatusIcon.svelte';
	import TallyCell from '#components/admin/digestion/TallyCell.svelte';
	import { cityFilter } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { authorLabel, SKIP_REASON_LABELS } from '#lib/culinary.js';
	import { SOURCE_PLATFORM_LABELS } from '#lib/digestion.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

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
	const platformOf = (row: Row) => row.review?.platform ?? row.post?.platform ?? '';

	// Each figure is an icon with its words in the tooltip, so the row fits the page
	const COLUMNS: Column<Row>[] = [
		{ type: 'date', name: 'Said', format: 'date', value: dateOf },
		{ type: 'snippet', name: 'Source', label: '', class: 'pr-0', snippet: sourceCell },
		{
			type: 'link',
			name: 'From',
			truncate: 22,
			// A review's venue; a post's author, opening the post's page
			href: (row) => (row.review ? `/admin/venues/${row.review.venue.id}` : `/admin/posts/${row.post!.id}`),
			value: (row) =>
				row.review ? row.review.venue.name : authorLabel(row.post!.platform, row.post!.author)
		},
		{
			type: 'value',
			name: 'Text',
			grow: true,
			value: (row) => row.excerpt ?? { value: 'no text', class: 'text-faint italic' }
		},
		{ type: 'snippet', name: 'Status', label: '', snippet: statusCell },
		{ type: 'snippet', name: 'Gave', label: 'Places · claims', snippet: gaveCell }
	];
</script>

{#snippet details(row: Row)}
	<DigestionDetail postId={row.post?.id} reviewId={row.review?.id} />
{/snippet}

{#snippet sourceCell(row: Row)}
	<span class="text-muted-foreground inline-flex items-center gap-1 tabular-nums">
		<PlatformIcon platform={platformOf(row)} tip={row.review ? `${SOURCE_PLATFORM_LABELS[platformOf(row)] ?? platformOf(row)} review` : true} />
		{#if row.review?.stars}<span class="text-ink text-xs font-medium">{row.review.stars}★</span>{/if}
	</span>
{/snippet}

{#snippet statusCell(row: Row)}
	<DigestionStatusIcon status={row.status} skipReason={row.post?.skipReason} />
{/snippet}

{#snippet gaveCell(row: Row)}
	<span class="inline-flex items-center gap-2.5 tabular-nums">
		{#if row.kind === 'post'}
			<Tooltip text={`${row.places} place${row.places === 1 ? '' : 's'} agent A took from it`}>
				<span class={['inline-flex items-center gap-0.5', row.places ? 'text-ink font-medium' : 'text-faint']}><Store class="size-3.5" />{row.places}</span>
			</Tooltip>
		{/if}
		<TallyCell sentiments={row.sentiments} />
	</span>
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
