<script lang="ts">
	import { ExternalLink, Pencil, Telescope } from '@lucide/svelte';
	import type { AdminTopicInsightOutputDto, AdminTopicOutputDto } from 'client';

	import TopicEditor from './components/TopicEditor.svelte';
	import TopicFigures from './components/TopicFigures.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import ExplorerHeader from '#components/admin/topics/ExplorerHeader.svelte';
	import TopicTermsManager from '#components/admin/topics/TopicTermsManager.svelte';
	import TreePopover from '#components/admin/topics/TreePopover.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { exploreTopicHref } from '#lib/explore.js';
	import { aspectPageHref, topicHref } from '#lib/topic-format.js';
	import { kindLabel } from '#lib/topic-kinds.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// One kind of food or drink, at any depth, laid out like a file explorer: its family on the
	// left (the topic at the top of its branch and everything under it, each its own page, with
	// its wordings counted), the topic itself on the right. Tab Wordings: the wordings that count
	// for it, as chips, where a wording is relinked or made a dish of its own. Tab Figures: its
	// venues, posts, searches, menu prices and Google Maps top ten in the city and month. Edit opens
	// its fields in place. An aspect's key opens the aspect's page.
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
	const childCount = $derived(food.filter((t) => t.parentKey === key).length);

	// Its family: the topic at the top of its branch and everything under that
	const top = $derived.by(() => {
		let at = topic;
		const seen: string[] = [];
		while (at?.parentKey && byKey.has(at.parentKey) && !seen.includes(at.key)) {
			seen.push(at.key);
			at = byKey.get(at.parentKey);
		}
		return at;
	});
	const family = $derived.by(() => {
		if (!top) return [];
		const keys = [top.key];
		for (let i = 0; i < keys.length; i++) for (const t of food) if (t.parentKey === keys[i] && !keys.includes(t.key)) keys.push(t.key);
		return keys.map((k) => {
			const t = byKey.get(k)!;
			const parent = t.parentKey ? byKey.get(t.parentKey) : undefined;
			return {
				key: t.key,
				label: t.label,
				parentKey: k === top.key ? undefined : t.parentKey,
				count: t.terms,
				...((!parent || parent.kind !== t.kind) && { tag: kindLabel(t.kind) })
			};
		});
	});

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
	const trendsUrl = (id: string) => `https://trends.google.com/trends/explore?cat=71&q=${encodeURIComponent(id)}`;
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
			type={topic.parentKey ? `${kindLabel(topic.kind)} under ${labelOf(topic.parentKey)}` : kindLabel(topic.kind)}
			code={topic.key}
			facts={[
				{ value: childCount, label: childCount === 1 ? 'topic under it' : 'topics under it' },
				{ value: topic.terms, label: 'wordings', hint: 'Wordings linked to it, in any city' },
				{ value: topic.venues, label: 'venues', hint: "The city's venues whose Google category is it" },
				{ value: topic.mentions, label: 'mentions', hint: "The city's matched mentions naming it, all time" }
			]}>
			{#snippet titleAside()}
				{#if family.length > 1}
					<TreePopover
						nodes={family}
						current={key}
						href={topicHref}
						countLabel="wordings"
						label={top && top.key !== key ? `${top.label} tree` : 'Its tree'}
						back={{ href: '/admin/topics', label: 'All topics' }} />
				{/if}
			{/snippet}
			{#snippet actions()}
				{#if adminCitiesStore.list.length > 1}
					<div class="w-36">
						<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setParam('cityId', v)} />
					</div>
				{/if}
				<Button size="sm" variant="ghost" icon={Telescope} href={exploreTopicHref(key, { cityId, month })}>Explore</Button>
				<Button size="sm" variant="outline" icon={Pencil} onclick={() => (editing = !editing)} aria-pressed={editing}>Edit</Button>
			{/snippet}
			{#if topic.trendsTopicId}
				<a class="inline-flex items-center gap-1" href={trendsUrl(topic.trendsTopicId)} target="_blank" rel="noreferrer">
					Searched on Google Trends as {topic.trendsTopicId} <ExternalLink class="size-3.5" />
				</a>
			{:else if topic.trendsQuery}
				<span>Searched on Google Trends as "{topic.trendsQuery}"</span>
			{:else}
				<span class="text-muted-foreground">Not searched on Google Trends: give it an id under Edit.</span>
			{/if}
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
