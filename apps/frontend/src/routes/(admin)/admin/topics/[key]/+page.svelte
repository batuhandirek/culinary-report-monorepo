<script lang="ts">
	import { Pencil, Telescope, TrendingUp } from '@lucide/svelte';
	import type { AdminTopicInsightOutputDto, AdminTopicOutputDto } from 'client';

	import TopicEditor from './components/TopicEditor.svelte';
	import TopicFigures from './components/TopicFigures.svelte';
	import TopicGraph from './components/TopicGraph.svelte';
	import TopicRelations from './components/TopicRelations.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import ExplorerHeader from '#components/admin/topics/ExplorerHeader.svelte';
	import TopicTermsManager from '#components/admin/topics/TopicTermsManager.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { exploreTopicHref } from '#lib/explore.js';
	import { aspectPageHref, topicHref } from '#lib/topic-format.js';
	import { kindLabel } from '#lib/topic-kinds.js';
	import { topicSentence } from '#lib/topic-sentence.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// One kind of food or drink, at any depth. Its heading says what it is as a sentence from its
	// edges ("Menemen is a Turkish dish and a breakfast."), each topic named in it a link, with its
	// relations both ways in a quiet line under it; Explore, Edit and Google Trends are icons. Under
	// the head its neighbourhood in the topic graph, where a click walks to another topic. Tab
	// Wordings: the wordings that count for it, as chips, where a wording is relinked or made a dish
	// of its own. Tab Figures: its venues, posts, searches, menu prices and Google Maps top ten in the
	// city and month. Edit opens its fields in place. An aspect's key opens the aspect's page.
	const key = $derived(decodeURIComponent(page.params.key ?? ''));

	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(param('cityId') ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id);
	const month = $derived(param('month') ?? lastMonth());
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	const TABS = [
		{ value: 'topic', label: 'Wordings' },
		{ value: 'figures', label: 'Figures' }
	];
	let tab = $state('topic');

	let topics = $state<AdminTopicOutputDto[] | null>(null);
	const topicsLoader = createLoader((query: { cityId: string }) => api.admin.getTopics(query), {
		onSuccess: (res) => (topics = res.topics)
	});
	const loadTopics = () => cityId && topicsLoader.load({ cityId });
	$effect(() => {
		loadTopics();
	});
	const topic = $derived(topics?.find((t) => t.key === key));
	$effect(() => {
		if (topic?.kind === 'aspect') goto(aspectPageHref(key), { replace: true });
	});
	const food = $derived((topics ?? []).filter((t) => t.kind !== 'aspect'));
	const byKey = $derived(new Map(food.map((t) => [t.key, t])));
	const labelOf = (k: string) => byKey.get(k)?.label ?? k;

	let insight = $state<AdminTopicInsightOutputDto | null>(null);
	const insightLoader = createLoader(
		(query: { key: string; cityId: string; month: string }) =>
			api.admin.getTopicInsight(query.key, { cityId: query.cityId, month: query.month }),
		{ onSuccess: (res) => (insight = res) }
	);
	const loadInsight = () => cityId && insightLoader.load({ key, cityId, month });
	$effect(() => {
		if (tab !== 'figures') return;
		insight = null;
		loadInsight();
	});

	let editing = $state(false);
	$effect(() => {
		void key;
		editing = false;
	});

	/** How Google Trends searches it: by its id, else by its words; neither until one is given under Edit */
	const trends = $derived.by(() => {
		const q = topic?.trendsTopicId ?? topic?.trendsQuery;
		if (!q) return null;
		return {
			href: `https://trends.google.com/trends/explore?cat=71&q=${encodeURIComponent(q)}`,
			label: topic?.trendsTopicId ? `Google Trends: searched as ${q}` : `Google Trends: searched as "${q}"`
		};
	});
</script>

<div class="flex min-w-0 flex-col gap-4 pb-12">
	{#if topicsLoader.error && !topics}
		<ErrorState onRetry={loadTopics} />
	{:else if !topics || topic?.kind === 'aspect'}
		<AdminPanel><SkeletonRows count={4} lines={1} /></AdminPanel>
	{:else if !topic}
		<EmptyState title="No such topic" hint={`No topic has the key "${key}".`}>
			<Button size="sm" variant="outline" href="/admin/topics">All topics</Button>
		</EmptyState>
	{:else}
		<ExplorerHeader
			title={topic.label}
			type={kindLabel(topic.kind)}
			code={topic.key}>
			{#snippet summary()}
				{#each topicSentence(topic, byKey) as part, i (i)}
					{#if part.key}<a
							class="text-ink decoration-line hover:decoration-ink font-semibold underline decoration-2 underline-offset-4"
							href={topicHref(part.key)}>{part.text}</a
						>{:else}{part.text}{/if}
				{/each}
			{/snippet}
			{#snippet meta()}
				<TopicRelations {topic} topics={food} />
			{/snippet}
			{#snippet actions()}
				{#if adminCitiesStore.list.length > 1}
					<div class="w-36">
						<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setParam('cityId', v)} />
					</div>
				{/if}
				{#if trends}
					<IconButton variant="ghost" icon={TrendingUp} label={trends.label} href={trends.href} target="_blank" rel="noreferrer" />
				{:else}
					<span
						class="text-faint flex size-8 items-center justify-center"
						title="Not searched on Google Trends: give it an id under Edit"
						role="img"
						aria-label="Not searched on Google Trends"><TrendingUp class="size-4" /></span>
				{/if}
				<IconButton variant="ghost" icon={Telescope} label="Explore its claims" href={exploreTopicHref(key, { cityId, month })} />
				<IconButton variant={editing ? 'secondary' : 'outline'} icon={Pencil} label="Edit" aria-pressed={editing} onclick={() => (editing = !editing)} />
			{/snippet}
		</ExplorerHeader>

		{#if editing}
			<AdminPanel title={`Edit ${topic.label}`}>
				<TopicEditor
					{topic}
					topics={food}
					onSaved={() => {
						editing = false;
						loadTopics();
					}}
					onCancel={() => (editing = false)} />
			</AdminPanel>
		{/if}

		<AdminPanel>
			<TopicGraph {topic} topics={food} />
		</AdminPanel>

		<div class="flex items-end justify-between gap-3">
			<AdminDetailTabs tabs={TABS} bind:value={tab} keeps={['cityId', 'month']} class="flex-1" />
			{#if tab === 'figures'}
				<div class="w-44 pb-1">
					<Select items={MONTHS} value={month} aria-label="Month" size="sm" onValueChange={(v) => setParam('month', v === lastMonth() ? undefined : v)} />
				</div>
			{/if}
		</div>

		{#if tab === 'topic'}
			{#if cityId}
				{#key `${cityId}:${key}`}
					<TopicTermsManager {cityId} {topic} onTopicsChanged={loadTopics} />
				{/key}
			{/if}
		{:else if insightLoader.error && !insight}
			<ErrorState onRetry={loadInsight} />
		{:else if !insight || !cityId}
			<AdminPanel><SkeletonRows count={6} lines={1} trailing /></AdminPanel>
		{:else}
			<TopicFigures data={insight} {cityId} {month} {labelOf} />
		{/if}
	{/if}
</div>
