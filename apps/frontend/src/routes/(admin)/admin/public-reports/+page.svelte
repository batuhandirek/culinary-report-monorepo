<script lang="ts">
	import CityMonthTab from './components/CityMonthTab.svelte';
	import FoodTrendsTab from './components/FoodTrendsTab.svelte';
	import FrontPageTab from './components/FrontPageTab.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { cityItems } from '#lib/admin-cities.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { quarterLabel, recentQuarters } from '#lib/food-trends.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import Select from '#ui/wrapped/Select.svelte';

	// The pages we publish about a city, each built from stored data: its month
	// (`/<city>/<month>`) and its quarter of food trends (`/<city>/trends/<YYYY>-q<N>`), published
	// by hand, and the front page's live edition (`/`), which the cron builds and publishes every
	// five days. The city outlives a change of tab; the month and the quarter belong to their tab.
	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(
		param('cityId') ??
			(adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};

	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));
	const month = $derived(param('month') ?? lastMonth());
	const QUARTERS = recentQuarters(6);
	const QUARTER_ITEMS = QUARTERS.map((q) => ({ value: q, label: quarterLabel(q) }));
	const quarter = $derived(param('quarter') ?? QUARTERS[0]);

	const TABS = [
		{ value: 'month', label: 'City month' },
		{ value: 'food-trends', label: 'Food trends' },
		{ value: 'front-page', label: 'Front page' }
	];
	let tab = $state('month');
</script>

<AdminPageHeader description={findAdminMenu(page.url.pathname)?.description}>
	{#snippet rightTitle()}
		<div class="flex items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select
						items={cityItems(adminCitiesStore.list)}
						value={cityId}
						aria-label="City"
						size="sm"
						onValueChange={(v) => setParam('cityId', v)}
					/>
				</div>
			{/if}
			{#if tab === 'food-trends'}
				<div class="w-36">
					<Select
						items={QUARTER_ITEMS}
						value={quarter}
						aria-label="Quarter"
						size="sm"
						onValueChange={(v) =>
							setParam('quarter', v === QUARTERS[0] ? undefined : v)}
					/>
				</div>
			{:else if tab === 'month'}
				<div class="w-44">
					<Select
						items={MONTHS}
						value={month}
						aria-label="Month"
						size="sm"
						onValueChange={(v) => setParam('month', v === lastMonth() ? undefined : v)}
					/>
				</div>
			{/if}
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5">
	<AdminDetailTabs tabs={TABS} bind:value={tab} keeps={['cityId']} />
	{#if cityId}
		{#key `${tab}:${cityId}`}
			{#if tab === 'food-trends'}
				<FoodTrendsTab {cityId} {quarter} />
			{:else if tab === 'front-page'}
				<FrontPageTab {cityId} />
			{:else}
				<CityMonthTab {cityId} {month} />
			{/if}
		{/key}
	{/if}
</div>
