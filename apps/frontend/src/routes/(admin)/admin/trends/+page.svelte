<script lang="ts">
	import { Plus } from '@lucide/svelte';

	import SearchInterestPanel from './components/SearchInterestPanel.svelte';
	import TrendsClaimsTab from './components/TrendsClaimsTab.svelte';
	import TrendsMissingAspectsTab from './components/TrendsMissingAspectsTab.svelte';
	import TrendsPostsTab from './components/TrendsPostsTab.svelte';
	import TrendsTermsTab from './components/TrendsTermsTab.svelte';
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
	// the month's posts (buzz) and Google searches (demand); then the month in posts, what guests praise and criticise by theme, every claim the month was split into, the aspects the tree lacks (its claims no aspect fits, grouped by meaning), searches,
	// openings and closures, the terms (every wording reviews, posts and Google's tags use, linked to
	// its topics), and the words no topic covers yet.
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
		{ value: 'claims', label: 'Claims' },
		{ value: 'missing', label: 'Missing aspects' },
		{ value: 'searches', label: 'Searches' },
		{ value: 'openings', label: 'Openings and closures' },
		{ value: 'terms', label: 'Terms' },
		{ value: 'words', label: 'Unrecognised words' }
	];
	let tab = $state('topics');

	let dialogOpen = $state(false);
	let newLabel = $state('');
	let newKind = $state<string>('cuisine');
	let newParent = $state<string | undefined>(undefined);
	let newHint = $state('');
	let version = $state(0);
	// Every topic, as the new one's possible parents (its own side of the tree)
	let topics = $state<TopicOption[]>([]);
	const newTopic = async (label = '', kind: string = 'cuisine', parent?: string, hint = '') => {
		newLabel = label;
		newKind = kind;
		newParent = parent;
		newHint = hint;
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
			{:else if tab === 'claims'}
				<TrendsClaimsTab {cityId} {month} />
			{:else if tab === 'missing'}
				<TrendsMissingAspectsTab {cityId} {month} onCreateAspect={(label, parent, hint) => newTopic(label, 'aspect', parent, hint)} />
			{:else if tab === 'searches'}
				<div class="pb-12"><SearchInterestPanel {cityId} {month} /></div>
			{:else if tab === 'openings'}
				<div class="pb-12"><VenueOpeningsPanel {cityId} {month} /></div>
			{:else if tab === 'terms'}
				<TrendsTermsTab {cityId} {version} onNewTopic={newTopic} />
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
	parent={newParent}
	aspectHint={newHint}
	{topics}
	onSaved={(saved) => {
		version++;
		goto(topicHref(saved.key));
	}} />
