<script lang="ts">
	import {
		type AdminBrandRowOutputDto,
		type AdminListBrandsOutputDto,
		ListBrandsParamsSegmentEnum as Segment,
		ListBrandsParamsSortEnum as SortBy
	} from 'client';

	import BrandNameCell from './components/BrandNameCell.svelte';
	import BrandSuggestions from './components/BrandSuggestions.svelte';
	import BuzzCell from './components/BuzzCell.svelte';
	import SalesSummary from './components/SalesSummary.svelte';
	import SuggestedProspects from './components/SuggestedProspects.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { prospectStageVariant } from '#components/admin/admin-format.js';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import { cityItems, districtOptions } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import {
		compact,
		currentMonth,
		lastMonth,
		leadScoreVariant,
		monthLabel,
		recentMonths
	} from '#lib/culinary.js';
	import { PROSPECT_STAGES, stageLabel } from '#lib/outreach-status.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import type { Column, Filter, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// Every business of a city, with the month's posts and reviews, its place on the sales list
	// and its report. A brand is the unit: its branches, posts, reviews and sales live on its page.
	adminCitiesStore.load();

	const TABS = [
		{ value: 'brands', label: 'Brands' },
		{ value: 'suggested', label: 'Suggested prospects' },
		{ value: 'merges', label: 'Look like one brand' }
	];
	let tab = $state('brands');

	// City and month live in the URL, so a link from Today or a shared one opens the same list
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(
		param('cityId') ??
			(adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const month = $derived(param('month') ?? lastMonth());
	const segment = $derived((param('segment') as Segment | undefined) ?? Segment.Talked);
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		url.searchParams.delete('page');
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	// Each segment's count comes with the list: the same search and district, every segment
	let segments = $state<AdminListBrandsOutputDto['segments'] | null>(null);
	const listBrands = async (params: Parameters<typeof api.admin.listBrands>[0]) => {
		const result = await api.admin.listBrands(params);
		segments = result.segments;
		return result;
	};
	const SEGMENTS = $derived([
		{ value: Segment.Talked, label: 'Talked about', count: segments?.talked },
		{ value: Segment.Prospects, label: 'Sales list', count: segments?.prospects },
		{ value: Segment.Customers, label: 'Customers', count: segments?.customers },
		{ value: Segment.Chains, label: 'Chains', count: segments?.chains },
		{ value: Segment.All, label: 'All', count: segments?.all }
	]);

	// What each segment is read for first
	const DEFAULT_SORT: Record<string, SortBy> = {
		[Segment.Talked]: SortBy.PostsDesc,
		[Segment.Prospects]: SortBy.FollowUpAsc,
		[Segment.Customers]: SortBy.NameAsc,
		[Segment.Chains]: SortBy.BranchesDesc,
		[Segment.All]: SortBy.LeadScoreDesc
	};
	const SORTS: Sort[] = [
		{ value: SortBy.PostsDesc, name: 'Most posts' },
		{ value: SortBy.ChangeDesc, name: 'Gaining posts' },
		{ value: SortBy.ViewsDesc, name: 'Most views' },
		{ value: SortBy.LeadScoreDesc, name: 'Best lead score' },
		{ value: SortBy.ReviewsDesc, name: 'Most reviews this month' },
		{ value: SortBy.RatingDesc, name: 'Best rated' },
		{ value: SortBy.FollowUpAsc, name: 'Next follow-up' },
		{ value: SortBy.BranchesDesc, name: 'Most branches' },
		{ value: SortBy.NameAsc, name: 'Name A–Z' }
	];
	const city = $derived(adminCitiesStore.list.filter((c) => c.id === cityId));
	const FILTERS: Filter[] = $derived([
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Brand or branch name…' },
		{ key: 'district', name: 'District', type: 'select', options: districtOptions(city) },
		{
			key: 'stage',
			name: 'Sales stage',
			type: 'select',
			options: PROSPECT_STAGES.map((s) => ({ name: s.label, value: s.value }))
		}
	]);
	const filters = $derived({
		sort: DEFAULT_SORT[segment] ?? SortBy.PostsDesc,
		segment,
		month,
		...(cityId && { cityId }),
		q: undefined
	});

	const COLUMNS: Column<AdminBrandRowOutputDto>[] = [
		{
			type: 'component',
			name: 'Brand',
			component: BrandNameCell,
			props: (row) => ({ row }),
			sort: { asc: SortBy.NameAsc, desc: SortBy.NameDesc }
		},
		{
			type: 'component',
			name: 'Posts',
			label: 'Posts',
			align: 'right',
			component: BuzzCell,
			props: (row) => ({ value: row.month.posts, previous: row.previous.posts }),
			sort: { asc: SortBy.PostsAsc, desc: SortBy.PostsDesc }
		},
		{
			type: 'value',
			name: 'Views',
			numeric: true,
			value: (row) => ({
				value: row.month.views ? compact(row.month.views) : '—',
				class: row.month.views ? '' : 'text-faint'
			}),
			sort: { asc: SortBy.ViewsAsc, desc: SortBy.ViewsDesc }
		},
		{
			type: 'value',
			name: 'Reviews',
			label: 'Reviews',
			numeric: true,
			value: (row) =>
				row.month.reviews
					? `${row.month.reviews}${row.month.stars ? ` · ${row.month.stars.toFixed(1)}★` : ''}`
					: { value: '—', class: 'text-faint' },
			sort: { asc: SortBy.ReviewsAsc, desc: SortBy.ReviewsDesc }
		},
		{
			type: 'count',
			name: 'Unanswered',
			label: 'To answer',
			tone: 'destructive',
			value: (row) => row.month.unanswered
		},
		{
			type: 'value',
			name: 'Rating',
			numeric: true,
			value: (row) =>
				row.venue?.rating
					? `${row.venue.rating.toFixed(1)} ★`
					: { value: '—', class: 'text-faint' },
			sort: { asc: SortBy.RatingAsc, desc: SortBy.RatingDesc }
		},
		{
			type: 'badge',
			name: 'Score',
			label: 'Score',
			value: (row) => (row.leadScore == null ? null : Math.round(row.leadScore).toString()),
			variant: (row) => leadScoreVariant(row.leadScore),
			sort: { asc: SortBy.LeadScoreAsc, desc: SortBy.LeadScoreDesc }
		},
		{
			type: 'badge',
			name: 'Sales',
			value: (row) => (row.prospect ? stageLabel(row.prospect.stage) : null),
			variant: (row) => (row.prospect ? prospectStageVariant(row.prospect.stage) : 'quiet')
		},
		{
			type: 'link',
			name: 'Report',
			href: (row) =>
				row.report ? `/admin/reports/${row.report.id}` : `/admin/brands/${row.id}?tab=reports`,
			value: (row) =>
				row.report
					? {
							value: row.report.sentAt ? 'Sent' : 'Built',
							class: row.report.sentAt ? 'text-success' : ''
						}
					: { value: '—', class: 'text-faint' }
		}
	];
</script>

<AdminListPage>
	{#snippet actions()}
		<div class="flex items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select
						items={cityItems(adminCitiesStore.list)}
						value={cityId}
						aria-label="City"
						size="sm"
						onValueChange={(v) => setParam('cityId', v)} />
				</div>
			{/if}
			<div class="w-44">
				<Select
					items={MONTHS}
					value={month}
					aria-label="Month"
					size="sm"
					onValueChange={(v) => setParam('month', v === lastMonth() ? undefined : v)} />
			</div>
		</div>
	{/snippet}

	<AdminDetailTabs tabs={TABS} bind:value={tab} keeps={['cityId', 'month']} />

	{#if tab === 'suggested'}
		<SuggestedProspects />
	{:else if tab === 'merges'}
		<BrandSuggestions />
	{:else}
		<AdminDetailTabs
			tabs={SEGMENTS}
			param="segment"
			variant="pills"
			keeps={['tab', 'cityId', 'month']} />
		{#if month === currentMonth()}
			<p class="ink-strip m-0 text-sm">
				{monthLabel(month)} is still going: its posts and reviews are those stored so far, and
				its reports come after the monthly run on the 2nd.
			</p>
		{/if}
		{#if segment === Segment.Prospects || segment === Segment.Customers}
			<SalesSummary />
		{/if}
		{#key segment}
			<PaginatedDataTable
				syncWithSearchParams
				{filters}
				api={listBrands}
				noun="brands"
				availableFilters={FILTERS}
				availableSorts={SORTS}
				columns={COLUMNS}
				emptyDescription={segment === Segment.Talked
					? `No posts by others named a brand in ${monthLabel(month)}. Pick another month or segment.`
					: undefined}
				rowHref={(row) => `/admin/brands/${row.id}`} />
		{/key}
	{/if}
</AdminListPage>
