<script lang="ts">
	import { Plus, Search } from '@lucide/svelte';
	import type { AdminTopicOutputDto } from 'client';

	import NewTopicForm from './components/NewTopicForm.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { topicHref } from '#lib/topic-format.js';
	import { FOOD_KIND_ITEMS } from '#lib/topic-kinds.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The kinds of food and drink as one tree, a section per type: each topic with what sits under
	// it, the wordings linked to it, and the city's venues and mentions on it; its page holds the
	// rest. "New topic" adds one in place, also filled from the Terms tab's suggestions
	// (`?new=Fries&kind=dish`). Aspects live on their own page.
	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(param('cityId') ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id);
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};

	let topics = $state<AdminTopicOutputDto[] | null>(null);
	const loader = createLoader((query: { cityId: string }) => api.admin.getTopics(query), {
		onSuccess: (res) => (topics = res.topics)
	});
	const load = () => cityId && loader.load({ cityId });
	$effect(() => {
		load();
	});

	const food = $derived((topics ?? []).filter((t) => t.kind !== 'aspect'));
	const byKey = $derived(new Map(food.map((t) => [t.key, t])));
	const childrenOf = (key: string) => food.filter((t) => t.parentKey === key);
	const byLabel = (a: AdminTopicOutputDto, b: AdminTopicOutputDto) => a.label.localeCompare(b.label);

	let kindFilter = $state<string>('all');
	let q = $state('');
	const search = $derived(q.trim().toLowerCase());
	const matches = (t: AdminTopicOutputDto) => t.label.toLowerCase().includes(search) || t.key.includes(search);

	/** One type's topics as a tree: a topic under another of its type is drawn under it, one under another type says so */
	const treeOf = (kind: string) => {
		const ofKind = food.filter((t) => t.kind === kind);
		const rows: { topic: AdminTopicOutputDto; depth: number }[] = [];
		const walk = (t: AdminTopicOutputDto, depth: number) => {
			rows.push({ topic: t, depth });
			ofKind.filter((c) => c.parentKey === t.key).sort(byLabel).forEach((c) => walk(c, depth + 1));
		};
		ofKind
			.filter((t) => !t.parentKey || byKey.get(t.parentKey)?.kind !== kind)
			.sort(byLabel)
			.forEach((t) => walk(t, 0));
		return search ? rows.filter((r) => matches(r.topic)).map((r) => ({ ...r, depth: 0 })) : rows;
	};
	const kinds = $derived(
		FOOD_KIND_ITEMS.filter((k) => kindFilter === 'all' || k.value === kindFilter)
			.map((k) => ({ ...k, rows: treeOf(k.value) }))
			.filter((k) => k.rows.length)
	);
	const countOf = (kind: string) => food.filter((t) => t.kind === kind).length;

	// "Create topic" from the Terms tab opens the form on the AI's suggested label
	let creating = $state(!!param('new'));
	const newLabel = param('new');
	const newKind = param('kind');
	const n = (v: number) => v.toLocaleString('en-GB');
</script>

<AdminPageHeader description={findAdminMenu(page.url.pathname)?.description}>
	{#snippet rightTitle()}
		<div class="flex items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setParam('cityId', v)} />
				</div>
			{/if}
			<Button size="sm" icon={Plus} onclick={() => (creating = true)}>New topic</Button>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	{#if creating && topics}
		<AdminPanel title="New topic">
			<NewTopicForm
				topics={food}
				label={newLabel}
				kind={newKind}
				onCreated={(key) => goto(topicHref(key))}
				onCancel={() => {
					creating = false;
					setParam('new', undefined);
				}} />
		</AdminPanel>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<button type="button" class="chip text-xs" aria-pressed={kindFilter === 'all'} onclick={() => (kindFilter = 'all')}>
			All {topics ? n(food.length) : ''}
		</button>
		{#each FOOD_KIND_ITEMS as k (k.value)}
			<button type="button" class="chip text-xs" aria-pressed={kindFilter === k.value} onclick={() => (kindFilter = k.value)}>
				{k.label} {topics ? n(countOf(k.value)) : ''}
			</button>
		{/each}
		<div class="ml-auto w-56">
			<Input bind:value={q} placeholder="Find a topic" icon={Search} aria-label="Find a topic" class="h-9" />
		</div>
	</div>

	{#if loader.error && !topics}
		<ErrorState onRetry={load} />
	{:else if !topics}
		<AdminPanel><SkeletonRows count={10} lines={1} trailing /></AdminPanel>
	{:else if !kinds.length}
		<EmptyState title="No topic matches" hint="Try another word or type." ground="none" />
	{:else}
		{#each kinds as k (k.value)}
			<AdminPanel title={k.label} note={n(k.rows.length)}>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="text-muted-foreground text-left text-xs">
							<tr>
								<th class="py-1.5 pr-3 font-normal">Topic</th>
								<th class="py-1.5 pr-3 font-normal">Under</th>
								<th class="py-1.5 pr-3 text-right font-normal" title="Topics directly under it, any type">Topics under it</th>
								<th class="py-1.5 pr-3 text-right font-normal" title="Wordings linked to it">Wordings</th>
								<th class="py-1.5 pr-3 text-right font-normal" title="The city's venues whose Google category resolves to it">Venues</th>
								<th class="py-1.5 text-right font-normal" title="The city's matched mentions resolving to it, all time">Mentions</th>
							</tr>
						</thead>
						<tbody>
							{#each k.rows as { topic, depth } (topic.key)}
								{@const parent = topic.parentKey ? byKey.get(topic.parentKey) : undefined}
								<tr class="border-t">
									<td class="py-1.5 pr-3" style:padding-left={`${depth * 1.25}rem`}>
										{#if depth}<span class="text-faint mr-1">└</span>{/if}
										<a class="font-medium" href={topicHref(topic.key)}>{topic.label}</a>
										{#if topic.key !== topic.label.toLowerCase()}<span class="text-faint ml-1 font-mono text-xs">{topic.key}</span>{/if}
									</td>
									<td class="text-muted-foreground py-1.5 pr-3 text-xs">
										{#if parent && (search || depth === 0)}<a href={topicHref(parent.key)}>{parent.label}</a>{/if}
									</td>
									<td class="py-1.5 pr-3 text-right tabular-nums">{childrenOf(topic.key).length || '—'}</td>
									<td class="py-1.5 pr-3 text-right tabular-nums">{topic.terms || '—'}</td>
									<td class="py-1.5 pr-3 text-right tabular-nums">{topic.venues || '—'}</td>
									<td class="py-1.5 text-right tabular-nums">{topic.mentions || '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</AdminPanel>
		{/each}
	{/if}
</div>
