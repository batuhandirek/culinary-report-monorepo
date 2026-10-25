<script lang="ts">
	import { ChevronDown, ExternalLink, FileText, MapPin, Send } from '@lucide/svelte';
	import type {
		AdminBrandOutputDto,
		AdminBrandSummaryOutputDto,
		AdminReportConfigOutputDto
	} from 'client';

	import { untrack } from 'svelte';

	import BrandBranchesTab from './components/BrandBranchesTab.svelte';
	import BrandOverviewTab from './components/BrandOverviewTab.svelte';
	import BrandPostsTab from './components/BrandPostsTab.svelte';
	import BrandReportsTab from './components/BrandReportsTab.svelte';
	import BrandReviewsTab from './components/BrandReviewsTab.svelte';
	import BrandSalesTab from './components/BrandSalesTab.svelte';
	import BrandSettingsTab from './components/BrandSettingsTab.svelte';
	import BrandSignalsTab from './components/BrandSignalsTab.svelte';
	import { BrandProspectStore } from './stores/BrandProspectStore.svelte.js';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { prospectStageVariant } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminDetailTabs, { type AdminDetailTab } from '#components/admin/AdminDetailTabs.svelte';
	import BrandCompetitors from '#components/admin/BrandCompetitors.svelte';
	import VenueFavicon from '#components/admin/venues/VenueFavicon.svelte';
	import { api } from '#lib/api.js';
	import { branchesByCity } from '#lib/brands.js';
	import { lastMonth, leadScoreVariant, monthLabel, recentMonths } from '#lib/culinary.js';
	import { stageLabel } from '#lib/outreach-status.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import * as DropdownMenu from '#ui/primitives-new/dropdown-menu/index.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Buttonish from '#ui/wrapped/Buttonish.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// The brand is the unit: its branches, what was said about it, its competitors, reports and
	// the sales conversation all hang off this page. A branch's own page holds only the place.
	let { data } = $props();
	// Mutations answer with the whole brand: kept here until the next load
	let updated = $state<AdminBrandOutputDto | null>(null);
	let brand: AdminBrandOutputDto = $derived(updated?.id === data.brand.id ? updated : data.brand);
	const set = (b: AdminBrandOutputDto) => (updated = b);

	const cities = $derived(branchesByCity(brand.branches));
	const open = $derived(brand.branches.filter((b) => !b.closed));
	const chain = $derived(brand.branches.length > 1);

	// Month and city live in the URL so every tab, a refresh and a shared link agree on them
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const month = $derived(param('month') ?? lastMonth());
	const cityId = $derived(param('cityId') ?? cities[0]?.cityId);
	const city = $derived(cities.find((c) => c.cityId === cityId) ?? cities[0]);
	// A one-place brand's place; a chain is shown as the brand, never as one of its branches
	const place = $derived(chain ? undefined : (city?.branches.find((b) => !b.closed) ?? city?.branches[0]));
	const cityOpen = $derived(city?.branches.filter((b) => !b.closed) ?? []);
	const icon = $derived(cityOpen.find((b) => b.favicon)?.favicon ?? place?.favicon);
	const category = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const b of cityOpen) if (b.category) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
		return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? place?.category;
	});
	// Stars over all the open places' Google reviews in the city: one place's own rating
	const rating = $derived.by(() => {
		const rated = (place ? [place] : cityOpen).filter((b) => b.rating != null && b.reviewsCount);
		const count = rated.reduce((sum, b) => sum + b.reviewsCount!, 0);
		return count
			? { stars: rated.reduce((sum, b) => sum + b.rating! * b.reviewsCount!, 0) / count, count }
			: undefined;
	});
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));
	const CITIES = $derived(cities.map((c) => ({ value: c.cityId, label: c.cityName })));

	// Its place on the sales list: the header, the Overview and the Sales tab share it
	const sales = new BrandProspectStore();
	$effect(() => {
		const id = brand.id;
		untrack(() => sales.load(id));
	});

	// The month in numbers: the Overview shows it, the tabs count from it
	let summary = $state<AdminBrandSummaryOutputDto | null>(null);
	const summaryLoader = createLoader(
		(id: string, query: { month: string; cityId?: string }) => api.admin.getBrandSummary(id, query),
		{ onSuccess: (s) => (summary = s) }
	);
	$effect(() => {
		const args = { month, ...(cityId && { cityId }) };
		const id = brand.id;
		untrack(() => {
			summary = null;
			summaryLoader.load(id, args);
		});
	});

	const tabs: AdminDetailTab[] = $derived([
		{ value: 'overview', label: 'Overview' },
		{ value: 'posts', label: 'Posts', count: summary ? summary.figures.posts + summary.figures.ownPosts : undefined },
		{ value: 'reviews', label: 'Reviews', count: summary?.figures.reviews },
		{
			value: 'branches',
			label: chain ? 'Branches' : 'Place',
			count: chain ? open.length : undefined
		},
		{ value: 'competitors', label: 'Competitors' },
		{ value: 'signals', label: 'Signals' },
		{ value: 'reports', label: 'Reports' },
		{ value: 'sales', label: 'Sales' },
		{ value: 'settings', label: 'Settings' }
	]);
	let tab = $state('overview');
	const KEEP = ['month', 'cityId'];
	const openTab = (next: string) => {
		const url = new URL(page.url.href);
		for (const name of [...url.searchParams.keys()]) {
			if (!KEEP.includes(name)) url.searchParams.delete(name);
		}
		if (next !== 'overview') url.searchParams.set('tab', next);
		goto(url, { replace: true, reset: false });
	};

	// Its report configurations: "Build report" builds one of them (or every active one), the
	// Reports tab lists and edits them
	let configs = $state<AdminReportConfigOutputDto[] | null>(null);
	$effect(() => {
		const id = brand.id;
		untrack(() => {
			configs = null;
			api.admin
				.listBrandReportConfigs(id)
				.then((list) => (configs = list))
				.catch(() => (configs = []));
		});
	});
	const activeConfigs = $derived(configs?.filter((c) => (c.status as string) === 'active') ?? []);

	// LLM calls over the month's data: a few seconds. A configuration builds that one report,
	// none builds every active configuration's (the default template's while none is active).
	const buildAction = createAction(
		(config?: AdminReportConfigOutputDto) =>
			api.admin.buildReport({
				brandId: brand.id,
				cityId: brand.reportScope === 'all' ? undefined : cityId,
				month,
				...(config && { configId: config.id })
			}),
		{
			onSuccess: (report) => goto(`/admin/reports/${report.id}`),
			successNotification: (_, [config]) => ({
				title: 'Report built',
				text: `${config ? `${config.name}, ` : ''}${brand.name}, ${monthLabel(month)}`
			})
		}
	);
	const addToSales = async () => {
		if (await sales.addAction.execute()) openTab('sales');
	};
</script>

<AdminPageHeader title={brand.name}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground flex items-center gap-1.5 text-xs">
			{#if icon}<VenueFavicon favicon={icon} />{/if}
			{chain ? `Chain · ${open.length} open places` : 'Brand'}{category ? ` · ${category}` : ''}
		</span>
	{/snippet}
	{#snippet belowTitle()}
		<div
			class="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
			{#if sales.prospect}
				<button type="button" class="cursor-pointer" onclick={() => openTab('sales')}>
					<Badge pill variant={prospectStageVariant(sales.prospect.stage)}>
						{stageLabel(sales.prospect.stage)}
					</Badge>
				</button>
			{/if}
			{#if brand.leadScore != null}
				<Badge pill variant={leadScoreVariant(brand.leadScore)}
					>Lead score {Math.round(brand.leadScore)}</Badge>
			{/if}
			{#if rating}
				<span
					>{rating.stars.toFixed(1)} ★ · {rating.count.toLocaleString('en')} reviews{chain
						? ` over ${cityOpen.length} places`
						: ''}</span>
			{/if}
			{#if place}
				{#if place.street || place.district}
					<span class="flex items-center gap-1">
						<MapPin class="size-4 shrink-0" />
						{[place.street, place.district].filter(Boolean).join(', ')}
					</span>
				{/if}
				<a href={`/admin/venues/${place.id}`} class="flex items-center gap-1 hover:underline">
					<ExternalLink class="size-4" /> Place details
				</a>
			{:else if cities.length}
				<span class="flex items-center gap-1">
					<MapPin class="size-4 shrink-0" />
					{cities
						.map((c) => `${c.cityName} (${c.branches.filter((b) => !b.closed).length})`)
						.join(', ')}
				</span>
			{/if}
		</div>
	{/snippet}
	{#snippet rightTitle()}
		<div class="flex shrink-0 flex-wrap items-center gap-2">
			{#if sales.prospect === null && open.length}
				<Button
					size="sm"
					variant="outline"
					icon={Send}
					loading={sales.addAction.executing}
					onclick={addToSales}>
					Add to sales
				</Button>
			{/if}
			{#if CITIES.length > 1}
				<div class="w-36">
					<Select
						items={CITIES}
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
			{#if configs?.length}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger disabled={buildAction.executing}>
						<Buttonish
							size="sm"
							icon={FileText}
							suffixIcon={ChevronDown}
							loading={buildAction.executing}
							disabled={buildAction.executing}>
							Build report
						</Buttonish>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-64" side="bottom" align="end">
						<DropdownMenu.Label>Configuration</DropdownMenu.Label>
						{#each configs as config (config.id)}
							<DropdownMenu.Item onclick={() => buildAction.execute(config)}>
								<span class="min-w-0 flex-1 truncate">{config.name}</span>
								{#if (config.status as string) !== 'active'}
									<Badge variant="quiet">Inactive</Badge>
								{/if}
							</DropdownMenu.Item>
						{/each}
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => buildAction.execute()}>
							{activeConfigs.length
								? `Every active configuration (${activeConfigs.length})`
								: 'Default template'}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<Button
					size="sm"
					icon={FileText}
					loading={buildAction.executing}
					onclick={() => buildAction.execute()}>
					Build report
				</Button>
			{/if}
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<AdminDetailTabs {tabs} bind:value={tab} keeps={KEEP} />
	{#key `${brand.id}:${tab}`}
		{#if tab === 'overview'}
			<BrandOverviewTab
				{brand}
				{month}
				{cityId}
				{summary}
				failed={summaryLoader.failed}
				onRetry={() => summaryLoader.reload()}
				{place}
				{sales}
				{openTab}
				onBuild={() => buildAction.execute()}
				building={buildAction.executing} />
		{:else if tab === 'posts'}
			<BrandPostsTab {brand} {month} />
		{:else if tab === 'reviews'}
			<BrandReviewsTab {brand} {month} {cityId} />
		{:else if tab === 'branches'}
			<BrandBranchesTab {brand} onChange={set} />
		{:else if tab === 'competitors'}
			{#if cityId}
				<BrandCompetitors brandId={brand.id} {cityId} />
			{/if}
		{:else if tab === 'signals'}
			<BrandSignalsTab {brand} {cityId} />
		{:else if tab === 'reports'}
			<BrandReportsTab
				{brand}
				{cityId}
				{month}
				{configs}
				onBuild={(config) => buildAction.execute(config)}
				building={buildAction.executing} />
		{:else if tab === 'sales'}
			<BrandSalesTab {brand} {sales} />
		{:else if tab === 'settings'}
			<BrandSettingsTab {brand} onChange={set} />
		{/if}
	{/key}
</div>
