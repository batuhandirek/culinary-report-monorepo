<script lang="ts">
	import { MessageSquareReply, RefreshCw } from '@lucide/svelte';
	import type { AdminBranchReviewOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DateRangeFilter from '#components/admin/DateRangeFilter.svelte';
	import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';
	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import TallyCell from '#components/admin/digestion/TallyCell.svelte';
	import { api } from '#lib/api.js';
	import { changeLabel, changesOf, tallyOf } from '#lib/statements.js';
	import type { Column } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// Google and TripAdvisor reviews, one line each, the same row on every page that lists them (a
	// brand's every branch, one branch's), opening in place on the review and the claims taken from
	// it. The dates are the table's own filter (`?from=&to=`, every day without); "Needs a reply"
	// (`?reply=1`) is the written ones of 3 stars or fewer nobody answered, worst first: what a
	// customer should act on.
	interface Props {
		/** Whose reviews: a brand's (in a city), or one branch's */
		scope: { brandId?: string; cityId?: string; venueId?: string };
		/** A chain's: which branch each is of */
		branches?: boolean;
	}

	let { scope, branches = false }: Props = $props();

	const isDay = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
	const from = $derived(isDay(page.url.searchParams.get('from')));
	const to = $derived(isDay(page.url.searchParams.get('to')));
	const reply = $derived(page.url.searchParams.get('reply') === '1');
	const setParams = (next: { from?: string; to?: string; reply?: string }) => {
		const url = new URL(page.url.href);
		for (const [key, value] of Object.entries(next)) {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		goto(url, { replace: true, reset: false });
	};

	type Row = AdminBranchReviewOutputDto;
	const answered = (row: Row) =>
		row.ownerResponse ? 'The owner replied' : row.markedRepliedAt ? 'Marked answered' : undefined;
	const COLUMNS: Column<Row>[] = $derived([
		{ type: 'date', name: 'Published', format: 'date', value: (row) => row.publishedAt },
		{ type: 'snippet', name: 'Stars', label: '', class: 'pr-0', snippet: starsCell },
		...(branches
			? [
					{
						type: 'link' as const,
						name: 'Branch',
						truncate: 18,
						href: (row: Row) => `/admin/venues/${row.branch.id}`,
						value: (row: Row) => row.branch.street ?? row.branch.name
					}
				]
			: []),
		{
			type: 'value',
			name: 'Review',
			grow: true,
			// Google's text carries `<br>`s: one line here
			value: (row) =>
				(row.textTranslated || row.text)?.replace(/<br\s*\/?>/gi, ' ') || { value: 'stars only', class: 'text-faint italic' }
		},
		{ type: 'snippet', name: 'Claims', snippet: claimsCell },
		{ type: 'snippet', name: 'Flags', label: '', snippet: flagsCell }
	]);

	const listReviews = (query: { page: number; size: number }) =>
		api.admin.listReviews({
			page: query.page,
			size: query.size,
			...scope,
			...(from && { from }),
			...(to && { to }),
			...(reply && { needsReply: true })
		});
</script>

{#snippet starsCell(row: Row)}
	<span class="inline-flex items-center gap-1 tabular-nums">
		<PlatformIcon platform={row.platform} tip={`${row.platform === 'tripadvisor' ? 'TripAdvisor' : 'Google'} review`} class="text-muted-foreground" />
		{#if row.stars}<span class={['text-xs font-semibold', row.stars <= 3 ? 'text-destructive' : 'text-ink']}>{row.stars}★</span>{/if}
	</span>
{/snippet}

{#snippet claimsCell(row: Row)}
	<TallyCell sentiments={tallyOf(row.statements)} />
{/snippet}

{#snippet flagsCell(row: Row)}
	{@const changes = changesOf(row.statements).map(changeLabel)}
	{@const answer = answered(row)}
	<span class="inline-flex items-center gap-2">
		{#if changes.length}
			<Tooltip text={`Changes noticed: ${changes.join(' · ')}`}><RefreshCw class="text-beet size-3.5" aria-label="Changes noticed" /></Tooltip>
		{/if}
		{#if answer}
			<Tooltip text={answer}><MessageSquareReply class="text-success size-3.5" aria-label={answer} /></Tooltip>
		{/if}
	</span>
{/snippet}

{#snippet details(row: Row)}
	<DigestionDetail reviewId={row.id} />
{/snippet}

{#snippet toolbar()}
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="chip h-8 text-xs"
			aria-pressed={reply}
			title="Written, 3 stars or fewer, nobody answered: worst first"
			onclick={() => setParams({ reply: reply ? undefined : '1' })}>Needs a reply</button>
		<DateRangeFilter {from} {to} onChange={(range) => setParams(range)} />
	</div>
{/snippet}

<PaginatedDataTable
	api={listReviews}
	noun="reviews"
	columns={COLUMNS}
	key={`${JSON.stringify(scope)}:${from}:${to}:${reply}`}
	limit={25}
	{toolbar}
	expand={details}
	rowKey={(row) => row.id}
	emptyDescription={reply
		? 'Nothing waiting for an answer in these dates.'
		: from || to
			? 'No review stored in these dates: reviews are scraped only while it is a report brand or a competitor.'
			: 'No review stored yet.'} />
