<script lang="ts">
	import { type AdminListAccountsOutputDto, ListAccountsParamsStatusEnum as Status } from 'client';

	import AccountsTab from './components/AccountsTab.svelte';
	import CreatorsTab from './components/CreatorsTab.svelte';
	import PostsTab from './components/PostsTab.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import AdminListPage from '#components/admin/AdminListPage.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import Select from '#ui/wrapped/Select.svelte';

	// Social: what we listened to (posts), who posted it (creators, each over all their
	// accounts), the venues' own accounts, and the handles that look like a venue's to review.
	// Creators and accounts are counted for a city and month, kept in the URL; the posts
	// table has its own filters.
	adminCitiesStore.load();

	let tab = $state('posts');
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(
		param('cityId') ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const month = $derived(param('month') ?? lastMonth());
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		url.searchParams.delete('page');
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	// The tabs' counts: read once for the city, then kept current by the accounts tabs' fetches
	let counts = $state<AdminListAccountsOutputDto['counts'] | null>(null);
	$effect(() => {
		if (!cityId) return;
		api.admin
			.listAccounts({ cityId, status: Status.Suggested, page: 1, size: 1 })
			.then((res) => (counts = res.counts))
			.catch(() => {});
	});
	const TABS = $derived([
		{ value: 'posts', label: 'Posts' },
		{ value: 'creators', label: 'Creators' },
		{ value: 'accounts', label: 'Own accounts', count: counts?.linked },
		{ value: 'review', label: 'To review', count: counts?.suggested }
	]);
</script>

<AdminListPage>
	{#snippet actions()}
		{#if tab !== 'posts'}
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
		{/if}
	{/snippet}

	<AdminDetailTabs tabs={TABS} bind:value={tab} keeps={['cityId', 'month']} />

	{#if tab === 'creators'}
		<CreatorsTab {cityId} {month} />
	{:else if tab === 'accounts'}
		{#key cityId}
			<AccountsTab status={Status.Linked} {cityId} {month} onCounts={(c) => (counts = c)} />
		{/key}
	{:else if tab === 'review'}
		{#key cityId}
			<AccountsTab status={Status.Suggested} {cityId} {month} onCounts={(c) => (counts = c)} />
		{/key}
	{:else}
		<PostsTab />
	{/if}
</AdminListPage>
