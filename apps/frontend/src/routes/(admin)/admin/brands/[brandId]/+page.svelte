<script lang="ts">
	import { Globe, Newspaper, Settings2, ShoppingCart, Telescope } from '@lucide/svelte';
	import type {
		AdminBrandOutputDto,
		AdminBrandSummaryOutputDto,
		AdminReportConfigOutputDto
	} from 'client';

	import { untrack } from 'svelte';

	import BrandBranchesTab from './components/BrandBranchesTab.svelte';
	import BrandHistoryTab from './components/BrandHistoryTab.svelte';
	import BrandOverviewTab from './components/BrandOverviewTab.svelte';
	import BrandPostsTab from './components/BrandPostsTab.svelte';
	import BrandSettingsTab from './components/BrandSettingsTab.svelte';
	import BrandSignalsTab from './components/BrandSignalsTab.svelte';
	import BuildReportButton from './components/BuildReportButton.svelte';
	import { BrandProspectStore } from './stores/BrandProspectStore.svelte.js';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDay } from '#components/admin/admin-format.js';
	import AdminDetailTabs, { type AdminDetailTab } from '#components/admin/AdminDetailTabs.svelte';
	import BrandAccounts from '#components/admin/BrandAccounts.svelte';
	import BrandCompetitors from '#components/admin/BrandCompetitors.svelte';
	import BranchSwitcher from '#components/admin/detail/BranchSwitcher.svelte';
	import DetailHead from '#components/admin/detail/DetailHead.svelte';
	import IconKey from '#components/admin/detail/IconKey.svelte';
	import Pill from '#components/admin/detail/Pill.svelte';
	import ReviewsTable from '#components/admin/reviews/ReviewsTable.svelte';
	import ClaimsTable from '#components/admin/statements/ClaimsTable.svelte';
	import { api } from '#lib/api.js';
	import { branchesByCity } from '#lib/brands.js';
	import { lastMonth, LEAD_PROSPECT_SCORE, monthLabel } from '#lib/culinary.js';
	import { exploreHref } from '#lib/explore.js';
	import { stageLabel } from '#lib/outreach-status.js';
	import { announceReportRun, followReportRun } from '#lib/report-runs.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import IconButton from '#ui/wrapped/IconButton.svelte';
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
	// The Overview's window: the last 30 days by default, 90 days or twelve months on the switch
	const period = $derived(param('period') ?? '30d');
	const cityId = $derived(param('cityId') ?? cities[0]?.cityId);
	const city = $derived(cities.find((c) => c.cityId === cityId) ?? cities[0]);
	// A one-place brand's place; a chain is shown as the brand, never as one of its branches
	const place = $derived(chain ? undefined : (city?.branches.find((b) => !b.closed) ?? city?.branches[0]));
	const cityOpen = $derived(city?.branches.filter((b) => !b.closed) ?? []);
	const icon = $derived(cityOpen.find((b) => b.favicon)?.favicon ?? place?.favicon);
	const website = $derived(cityOpen.find((b) => b.website)?.website ?? place?.website);
	const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
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
	const CITIES = $derived(cities.map((c) => ({ value: c.cityId, label: c.cityName })));

	// Its place on the sales list: the header, the Overview and the Sales tab share it
	const sales = new BrandProspectStore();
	$effect(() => {
		const id = brand.id;
		untrack(() => sales.load(id));
	});

	// The window in numbers: the Overview shows it, the tabs count from it
	let summary = $state<AdminBrandSummaryOutputDto | null>(null);
	const summaryLoader = createLoader(
		(id: string, query: { month: string; cityId?: string; period: string }) =>
			api.admin.getBrandSummary(id, query as Parameters<typeof api.admin.getBrandSummary>[1]),
		{ onSuccess: (s) => (summary = s) }
	);
	$effect(() => {
		const args = { month, period, ...(cityId && { cityId }) };
		const id = brand.id;
		untrack(() => {
			summary = null;
			summaryLoader.load(id, args);
		});
	});

	// Reports and the sales conversation are its History; Settings opens from the header's key
	const tabs: AdminDetailTab[] = $derived([
		{ value: 'overview', label: 'Overview' },
		{ value: 'posts', label: 'Posts', count: summary ? summary.figures.posts + summary.figures.ownPosts : undefined },
		{ value: 'reviews', label: 'Reviews', count: summary?.figures.reviews },
		{ value: 'claims', label: 'Claims' },
		{ value: 'places', label: 'Places', count: open.length },
		{ value: 'competitors', label: 'Competitors' },
		{ value: 'signals', label: 'Signals' },
		{ value: 'history', label: 'History' },
		{ value: 'settings', label: 'Settings', hidden: true }
	]);
	let tab = $state('overview');
	const KEEP = ['month', 'cityId', 'period'];
	// A tab's own filters are left behind; `params` opens it on one (Reviews' "Needs a reply")
	const openTab = (next: string, params: Record<string, string> = {}) => {
		const url = new URL(page.url.href);
		for (const name of [...url.searchParams.keys()]) {
			if (!KEEP.includes(name)) url.searchParams.delete(name);
		}
		if (next !== 'overview') url.searchParams.set('tab', next);
		for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
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

	// LLM calls over the month's data, run in the background and followed until done (a run that
	// waits for an LLM account goes on by itself; the toast links it). A configuration builds that
	// one report, none builds every active configuration's (the default template's while none is active).
	const buildAction = createAction(
		async (config?: AdminReportConfigOutputDto) =>
			followReportRun(
				await api.admin.buildReport({
					brandId: brand.id,
					cityId: brand.reportScope === 'all' ? undefined : cityId,
					month,
					...(config && { configId: config.id })
				})
			),
		{
			onSuccess: (run, [config]) => {
				const built = announceReportRun(run, {
					title: 'Report built',
					text: `${config ? `${config.name}, ` : ''}${brand.name}, ${monthLabel(month)}`
				});
				if (built && run.reportIds?.[0]) goto(`/admin/reports/${run.reportIds[0]}`);
			}
		}
	);
	const addToSales = async () => {
		if (await sales.addAction.execute()) openTab('history');
	};
	const report = $derived(summary?.report);
</script>

<DetailHead title={brand.name} favicon={icon}>
	{#snippet pills()}
		{#if chain}<Pill>Chain · {open.length} places</Pill>{/if}
		{#if rating}
			<Pill tone="ink" title={chain ? `Stars over ${cityOpen.length} places' Google reviews` : 'Google rating'}
				>{rating.stars.toFixed(1)} ★ · {rating.count.toLocaleString('en')}</Pill>
		{/if}
		{#if brand.leadScore != null}
			<Pill tone={brand.leadScore >= LEAD_PROSPECT_SCORE ? 'good' : 'sand'} href="?tab=history" title="Lead score: how it is scored is on History"
				>Lead {Math.round(brand.leadScore)}</Pill>
		{/if}
	{/snippet}
	{#snippet sub()}
		<span class="text-muted-foreground">
			{#if category}{category} ·{/if}
			{#each cities as c, i (c.cityId)}
				<a href={`/admin/cities/${c.cityId}`}>{c.cityName}</a>
				({c.branches.filter((b) => !b.closed).length} open){i < cities.length - 1 ? ',' : ''}
			{/each}
			·
			{#if report}
				<a href={`/admin/reports/${report.id}`}>{monthLabel(report.month)} report</a>{report.sentAt
					? `, sent ${onDay(report.sentAt)}`
					: ', not sent'}
			{:else if summary}
				no report yet
			{/if}
			·
			{#if sales.prospect}
				<a href="?tab=history" onclick={(e) => (e.preventDefault(), openTab('history'))}
					>{stageLabel(sales.prospect.stage).toLowerCase()}</a
				>{sales.prospect.nextFollowUpAt ? `, follow up ${onDay(sales.prospect.nextFollowUpAt)}` : ''}
			{:else if sales.prospect === null}
				not on the sales list
			{/if}
		</span>
	{/snippet}
	{#snippet actions()}
		{#if website}<IconKey icon={Globe} label={`Website · ${host(website)}`} href={website} />{/if}
		<IconKey icon={Newspaper} label="Its posts in Social" href={`/admin/posts?q=${encodeURIComponent(brand.name)}`} internal />
		<BrandAccounts
			brandId={brand.id}
			branches={chain ? brand.branches.map((b) => ({ id: b.id, name: b.name, street: b.street ?? undefined })) : []} />
		{#if cityId}
			<IconKey
				icon={Telescope}
				label="What is said about it, in Explore"
				href={exploreHref({ cityId, brandId: brand.id })}
				internal />
		{/if}
		{#if sales.prospect === null && open.length}
			<IconKey icon={ShoppingCart} label="Add to sales" disabled={sales.addAction.executing} onclick={addToSales} />
		{/if}
		{#if chain}
			<span class="bg-line mx-[3px] h-5 w-px"></span>
			<BranchSwitcher brandId={brand.id} brandName={brand.name} count={open.length} branches={brand.branches} />
		{/if}
		<BuildReportButton
			{month}
			{configs}
			building={buildAction.executing}
			onBuild={(config) => buildAction.execute(config)}
			onMonth={(m) => setParam('month', m === lastMonth() ? undefined : m)} />
		<IconButton
			icon={Settings2}
			label="Brand settings"
			variant="outline"
			class="border-line size-[30px] rounded-md"
			onclick={() => openTab('settings')} />
	{/snippet}
</DetailHead>

<div class="flex min-w-0 flex-col gap-3 pb-12">
	<AdminDetailTabs {tabs} bind:value={tab} keeps={KEEP} dense>
		{#snippet end()}
			{#if CITIES.length > 1}
				<Select items={CITIES} value={cityId} aria-label="City" size="sm" width={140} onValueChange={(v) => setParam('cityId', v)} />
			{/if}
		{/snippet}
	</AdminDetailTabs>
	{#key `${brand.id}:${tab}`}
		{#if tab === 'overview'}
			<BrandOverviewTab
				{brand}
				{cityId}
				{summary}
				{period}
				onPeriod={(p) => setParam('period', p === '30d' ? undefined : p)}
				failed={summaryLoader.failed}
				onRetry={() => summaryLoader.reload()}
				{openTab} />
		{:else if tab === 'posts'}
			<BrandPostsTab {brand} />
		{:else if tab === 'reviews'}
			<ReviewsTable scope={{ brandId: brand.id, cityId }} branches={chain} />
		{:else if tab === 'claims'}
			{#if cityId}
				{#key cityId}
					<p class="m-0 -mb-2 text-sm">
						<a class="text-beet" href={exploreHref({ cityId, brandId: brand.id })}>Explore what is said about it</a>
						<span class="text-muted-foreground">: any topic, broken down by branch, month and source</span>
					</p>
					<ClaimsTable
						scope={{ brandId: brand.id, cityId }}
						topicsCityId={cityId}
						scopeLabel={`What its branches' reviews and the posts about it said in ${city?.cityName ?? 'the city'}`} />
				{/key}
			{/if}
		{:else if tab === 'places'}
			<BrandBranchesTab {brand} onChange={set} />
		{:else if tab === 'competitors'}
			{#if cityId}
				<BrandCompetitors brandId={brand.id} {cityId} />
			{/if}
		{:else if tab === 'signals'}
			<BrandSignalsTab {brand} {cityId} />
		{:else if tab === 'history'}
			<BrandHistoryTab
				{brand}
				{cityId}
				{month}
				{configs}
				{sales}
				onBuild={(config) => buildAction.execute(config)}
				building={buildAction.executing} />
		{:else if tab === 'settings'}
			<BrandSettingsTab {brand} onChange={set} />
		{/if}
	{/key}
</div>
