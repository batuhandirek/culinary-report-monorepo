<script lang="ts">
	import type { AdminBranchReviewOutputDto, AdminBrandOutputDto } from 'client';

	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import TalksAbout from '#components/admin/feedback/TalksAbout.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel, sentimentVariant } from '#lib/culinary.js';
	import { changesOf } from '#lib/feedback.js';
	import type { Column } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';

	// Every branch's Google and TripAdvisor reviews of the month; "Needs a reply" is the written
	// ones of 3 stars or fewer nobody answered, worst first: what a customer should act on.
	interface Props {
		brand: AdminBrandOutputDto;
		month: string;
		cityId?: string;
	}

	let { brand, month, cityId }: Props = $props();
	const chain = $derived(brand.branches.length > 1);

	const VIEWS = [
		{ value: 'month', label: monthLabel(month) },
		{ value: 'reply', label: 'Needs a reply' },
		{ value: 'all', label: 'All months' }
	];
	let view = $state('month');

	const COLUMNS: Column<AdminBranchReviewOutputDto>[] = $derived([
		{ type: 'date', name: 'Published', format: 'date', value: (row) => row.publishedAt },
		{ type: 'value', name: 'Stars', value: (row) => (row.stars ? '★'.repeat(row.stars) : '') },
		...(chain
			? [
					{
						type: 'link' as const,
						name: 'Branch',
						truncate: 24,
						href: (row: AdminBranchReviewOutputDto) => `/admin/venues/${row.branch.id}`,
						value: (row: AdminBranchReviewOutputDto) => row.branch.street ?? row.branch.name
					}
				]
			: []),
		{
			type: 'value',
			name: 'Review',
			truncate: 80,
			value: (row) => row.textTranslated || row.text || ''
		},
		{
			type: 'badge',
			name: 'Sentiment',
			value: (row) => row.sentiment,
			variant: (row) => sentimentVariant(row.sentiment)
		},
		{
			type: 'component',
			name: 'Talks about',
			component: TalksAbout as never,
			props: (row) => ({ feedback: row.feedback, cityId, month: new Date(row.publishedAt).toISOString().slice(0, 7), compact: true })
		},
		{
			type: 'value',
			name: 'Changes noticed',
			truncate: 40,
			value: (row) => changesOf(row.feedback).join(' · ')
		},
		{
			type: 'value',
			name: 'Answered',
			value: (row) =>
				row.ownerResponse ? 'Owner replied' : row.markedRepliedAt ? 'Marked answered' : ''
		},
		{ type: 'value', name: 'On', value: (row) => (row.platform === 'tripadvisor' ? 'TripAdvisor' : 'Google') }
	]);

	const listReviews = (query: { page: number; size: number }) =>
		api.admin.listReviews({
			page: query.page,
			size: query.size,
			brandId: brand.id,
			...(cityId && { cityId }),
			...(view === 'month' && { month }),
			...(view === 'reply' && { needsReply: true, month })
		});
</script>

<div class="flex flex-col gap-3">
	<AdminDetailTabs tabs={VIEWS} bind:value={view} param="reviews" variant="pills" keeps={['tab', 'month', 'cityId']} />
	{#key view}
		<PaginatedDataTable
			api={listReviews}
			noun="reviews"
			columns={COLUMNS}
			emptyDescription={view === 'reply'
				? 'Nothing waiting for an answer this month.'
				: view === 'month'
					? `No review of ${monthLabel(month)} stored: its reviews are scraped only while it is a report brand or a competitor.`
					: 'No review stored yet.'} />
	{/key}
</div>
