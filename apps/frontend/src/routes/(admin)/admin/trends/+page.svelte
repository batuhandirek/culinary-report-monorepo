<script lang="ts">
	import { Plus } from '@lucide/svelte';

	import SearchInterestPanel from './components/SearchInterestPanel.svelte';
	import TrendsDishNamesTab from './components/TrendsDishNamesTab.svelte';
	import TrendsPostsTab from './components/TrendsPostsTab.svelte';
	import TrendsThemesTab from './components/TrendsThemesTab.svelte';
	import TrendsTopicsTab from './components/TrendsTopicsTab.svelte';
	import VenueOpeningsPanel from './components/VenueOpeningsPanel.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import TopicFormDialog from '#components/admin/topics/TopicFormDialog.svelte';
	import UnrecognisedWords from '#components/admin/topics/UnrecognisedWords.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { topicHref } from '#lib/topic-format.js';
	import { type TopicOption, toTopicOption } from '#lib/topic-kinds.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// What the city eats and talks about. Topics first: each kind of food with its venues (supply),
	// the month's posts (buzz) and Google searches (demand); then the month in posts, what guests praise and criticise by theme, searches,
	// openings and closures, the dish names reviews and posts use (each counting for a topic), and the
	// words no topic covers yet.
	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(
		param('cityId') ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const month = $derived(param('month') ?? lastMonth());
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	const TABS = [
		{ value: 'topics', label: 'Topics' },
		{ value: 'posts', label: 'In posts' },
		{ value: 'themes', label: 'Praise and complaints' },
		{ value: 'searches', label: 'Searches' },
		{ value: 'openings', label: 'Openings and closures' },
		{ value: 'dishes', label: 'Dish names' },
		{ value: 'words', label: 'Unrecognised words' }
	];
	let tab = $state('topics');

	let dialogOpen = $state(false);
	let newLabel = $state('');
	let newKind = $state<'cuisine' | 'dish' | 'drink'>('cuisine');
	let version = $state(0);
	// Every topic, as the new one's possible parents (its own side of the tree)
	let topics = $state<TopicOption[]>([]);
	const newTopic = async (label = '', kind: 'cuisine' | 'dish' | 'drink' = 'cuisine') => {
		newLabel = label;
		newKind = kind;
		dialogOpen = true;
		if (!topics.length && cityId) {
			const res = await api.admin.getTopics({ cityId });
			topics = res.topics.map(toTopicOption);
		}
	};
</script>

<AdminPageHeader description={findAdminMenu(page.url.pathname)?.description}>
	{#snippet rightTitle()}
		<div class="flex items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setParam('cityId', v)} />
				</div>
			{/if}
			<div class="w-44">
				<Select items={MONTHS} value={month} aria-label="Month" size="sm" onValueChange={(v) => setParam('month', v === lastMonth() ? undefined : v)} />
			</div>
			<Button size="sm" icon={Plus} onclick={() => newTopic()}>New topic</Button>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5">
	<AdminDetailTabs tabs={TABS} bind:value={tab} keeps={['cityId', 'month']} />
	{#if cityId}
		{#key `${tab}:${cityId}:${month}`}
			{#if tab === 'topics'}
				<TrendsTopicsTab {cityId} {month} {version} />
			{:else if tab === 'posts'}
				<TrendsPostsTab {cityId} {month} />
			{:else if tab === 'themes'}
				<TrendsThemesTab {cityId} {month} />
			{:else if tab === 'searches'}
				<div class="pb-12"><SearchInterestPanel {cityId} {month} /></div>
			{:else if tab === 'openings'}
				<div class="pb-12"><VenueOpeningsPanel {cityId} {month} /></div>
			{:else if tab === 'dishes'}
				<TrendsDishNamesTab {cityId} {version} onNewTopic={newTopic} />
			{:else}
				<div class="pb-12"><UnrecognisedWords {cityId} {version} onNewTopic={newTopic} /></div>
			{/if}
		{/key}
	{/if}
</div>

<TopicFormDialog
	bind:active={dialogOpen}
	label={newLabel}
	kind={newKind}
	{topics}
	onSaved={(saved) => {
		version++;
		goto(topicHref(saved.key));
	}} />
