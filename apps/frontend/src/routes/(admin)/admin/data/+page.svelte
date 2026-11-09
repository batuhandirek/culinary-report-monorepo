<script lang="ts">
	import ApifyRunsTab from './components/ApifyRunsTab.svelte';
	import DataMonthsTab from './components/DataMonthsTab.svelte';
	import LlmBacklogsPanel from './components/LlmBacklogsPanel.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { cityItems } from '#lib/admin-cities.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import Select from '#ui/wrapped/Select.svelte';

	// Which months are complete, the runs behind them, and what the actors cost
	adminCitiesStore.load();
	const cityId = $derived(
		page.url.searchParams.get('cityId') ??
			(adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const pickCity = (id: string) => {
		const url = new URL(page.url.href);
		url.searchParams.set('cityId', id);
		goto(url, { replace: true, reset: false });
	};

	const TABS = [
		{ value: 'months', label: 'Months' },
		{ value: 'backlogs', label: 'LLM backlogs' },
		{ value: 'apify', label: 'Apify costs' }
	];
	let tab = $state('months');
</script>

<AdminPageHeader description={findAdminMenu(page.url.pathname)?.description}>
	{#snippet rightTitle()}
		{#if adminCitiesStore.list.length > 1}
			<div class="w-44">
				<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => v && pickCity(v)} />
			</div>
		{/if}
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5">
	<AdminDetailTabs tabs={TABS} bind:value={tab} keeps={['cityId']} />
	{#if cityId}
		{#key `${tab}:${cityId}`}
			{#if tab === 'months'}
				<DataMonthsTab {cityId} />
			{:else if tab === 'backlogs'}
				<LlmBacklogsPanel />
			{:else}
				<ApifyRunsTab />
			{/if}
		{/key}
	{/if}
</div>
