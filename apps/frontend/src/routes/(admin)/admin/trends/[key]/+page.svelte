<script lang="ts">
	import { ExternalLink, Pencil } from '@lucide/svelte';
	import type { AdminSearchRelatedQueryOutputDto, AdminTopicInsightOutputDto } from 'client';

	import FoodTopicFormDialog from '#components/admin/topics/FoodTopicFormDialog.svelte';
	import TopicTable from '#components/admin/topics/TopicTable.svelte';
	import { kindLabel } from '#lib/food-topic-kinds.js';
	import { change, points, tone, topicHref } from '#lib/topic-format.js';

	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import MonthChart from '#components/charts/MonthChart.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { lastMonth, monthLabel, recentMonths } from '#lib/culinary.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// One food topic in a city: its venues, how much posts talk about it and how Google searches
	// for it move over twelve months, what people search alongside it, and the topics under it
	const key = $derived(decodeURIComponent(page.params.key ?? ''));

	adminCitiesStore.load();
	let cityId = $state('');
	$effect(() => {
		if (!cityId) cityId = adminCitiesStore.list.find((c) => c.active)?.id ?? '';
	});
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));
	let month = $state(lastMonth());

	let data = $state<AdminTopicInsightOutputDto | null>(null);
	const loader = createLoader(
		(query: { key: string; cityId: string; month: string }) =>
			api.admin.getTopicInsight(query.key, { cityId: query.cityId, month: query.month }),
		{ onSuccess: (res) => (data = res) }
	);
	const load = () => cityId && loader.load({ key, cityId, month });
	$effect(() => {
		data = null;
		load();
	});

	// The month both charts and the readouts show; the newest until one is picked
	let selected = $state(11);
	$effect(() => {
		if (data) selected = data.months.length - 1;
	});

	const VENUES_SHOWN = 25;
	let allVenues = $state(false);
	const SOURCE: Record<string, string> = { category: 'Google category', mentions: 'posts', manual: 'admin' };
	const rising = (q: AdminSearchRelatedQueryOutputDto) => (q.breakout ? 'Breakout' : `+${q.value.toLocaleString('en')} %`);
	const trendsUrl = (id: string) => `https://trends.google.com/trends/explore?cat=71&q=${encodeURIComponent(id)}`;

	// Editing needs every topic for the parent picker
	let editing = $state(false);
	let allTopics = $state<{ key: string; label: string }[]>([]);
	const openEdit = async () => {
		if (!allTopics.length)
			allTopics = (await api.admin.getFoodTopics({ cityId })).topics.map((t) => ({ key: t.key, label: t.label }));
		editing = true;
	};
	const labelOf = (k: string) =>
		data?.children.find((c) => c.key === k)?.label ?? k.charAt(0).toUpperCase() + k.slice(1);
</script>

{#snippet queries(title: string, list: AdminSearchRelatedQueryOutputDto[], isRising: boolean)}
	<div class="min-w-0">
		<p class="eyebrow text-muted-foreground m-0 mb-1">{title}</p>
		{#if list.length}
			<ol class="m-0 list-none p-0 text-sm">
				{#each list.slice(0, 12) as q (q.query)}
					<li class="flex justify-between gap-3 border-t py-1">
						<span class="truncate" title={q.query}>{q.query}</span>
						<span class="shrink-0 tabular-nums {isRising ? 'text-primary-darker' : 'text-muted-foreground'}">
							{isRising ? rising(q) : q.value}
						</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="text-muted-foreground m-0 text-xs">None in this window</p>
		{/if}
	</div>
{/snippet}

<AdminPageHeader title={data?.row.label ?? labelOf(key)}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">Topic{data ? ` · ${kindLabel(data.row.kind)}` : ''}</span>
	{/snippet}
	{#snippet belowTitle()}
		{#if data}
			<div class="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
				{#if data.parent}
					<span>Part of <a href={topicHref(data.parent.key)}>{data.parent.label}</a></span>
				{/if}
				{#if data.aliases.length}<span>Also: {data.aliases.join(', ')}</span>{/if}
				{#if data.trendsTopicId}
					<a class="flex items-center gap-1" href={trendsUrl(data.trendsTopicId)} target="_blank" rel="noreferrer">
						Google Trends {data.trendsTopicId} <ExternalLink class="size-3.5" />
					</a>
				{:else if data.trendsQuery}
					<span>Google Trends: "{data.trendsQuery}"</span>
				{:else}
					<Badge pill variant="secondary">Not searched on Google</Badge>
				{/if}
			</div>
		{/if}
	{/snippet}
	{#snippet rightTitle()}
		<div class="flex items-center gap-2">
			<Select items={cityItems(adminCitiesStore.list)} bind:value={cityId} aria-label="City" size="sm" />
			<Select items={MONTHS} bind:value={month} aria-label="Month" size="sm" />
			<Button size="sm" variant="outline" icon={Pencil} disabled={!data} onclick={openEdit}>Edit</Button>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	{#if loader.error && !data}
		<ErrorState onRetry={load} />
	{:else if !data}
		<AdminPanel><SkeletonRows count={6} lines={1} trailing /></AdminPanel>
	{:else}
		<!-- The month in three numbers: supply, buzz, demand -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="bg-paper border-line rounded-md border p-4">
				<p class="eyebrow text-muted-foreground m-0">Venues</p>
				<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">{data.row.venues}</p>
				<p class="text-muted-foreground m-0 text-xs">{data.row.primaryVenues} have it as their main food</p>
			</div>
			<div class="bg-paper border-line rounded-md border p-4">
				<p class="eyebrow text-muted-foreground m-0">Posts · {monthLabel(month)}</p>
				<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">{data.row.posts}</p>
				<p class="m-0 text-xs">
					<span class="text-muted-foreground">{data.row.share === null ? 'no share' : `${data.row.share} % of posts`}</span>
					<span class={tone(data.row.shareChange, 1)}> · {points(data.row.shareChange)}</span>
				</p>
			</div>
			<div class="bg-paper border-line rounded-md border p-4">
				<p class="eyebrow text-muted-foreground m-0">Google searches</p>
				<p class="m-0 mt-1 text-2xl font-semibold tabular-nums {tone(data.row.searchChange, 0.05)}">
					{change(data.row.searchChange)}
				</p>
				<p class="text-muted-foreground m-0 text-xs">against the month before</p>
			</div>
		</div>

		<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
			<MonthChart
				title="Google searches"
				note="Its own best month in twelve is 100: read the shape, not the level against another topic."
				months={data.months}
				values={data.row.searches}
				format={(v) => String(Math.round(v))}
				ceiling={100}
				venueName={data.row.label}
				{selected}
				onSelect={(i) => (selected = i)} />
			<MonthChart
				title="Posts about it"
				note="Posts by others about venues serving it, or about it."
				months={data.months}
				values={data.postsByMonth}
				kind="column"
				format={(v) => String(v)}
				unit="posts"
				venueName={data.row.label}
				{selected}
				onSelect={(i) => (selected = i)} />
		</div>

		<AdminPanel title="What people search with it" note="Google, twelve months">
			{#if data.related}
				<div class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
					{@render queries('Rising', data.related.rising, true)}
					{@render queries('Top', data.related.top, false)}
				</div>
			{:else}
				<p class="text-muted-foreground m-0 text-sm">No related searches stored for this month's pull.</p>
			{/if}
		</AdminPanel>

		{#if data.children.length}
			<AdminPanel title="Under it" note={`${data.children.length}`}>
				<TopicTable rows={data.children} months={data.months} {labelOf} />
			</AdminPanel>
		{/if}

		<AdminPanel title="Venues" note={`${data.venues.length}`}>
			{#if !data.venues.length}
				<EmptyState title="No venue is tagged with it" hint="Tag one from a venue's Overview tab." ground="none" size="sm" />
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="text-muted-foreground text-left text-xs">
							<tr>
								<th class="py-1.5 pr-3 font-normal">Venue</th>
								<th class="py-1.5 pr-3 font-normal">District</th>
								<th class="py-1.5 pr-3 font-normal">Why</th>
								<th class="py-1.5 pr-3 text-right font-normal">Posts · {monthLabel(month)}</th>
								<th class="py-1.5 text-right font-normal">Google</th>
							</tr>
						</thead>
						<tbody>
							{#each allVenues ? data.venues : data.venues.slice(0, VENUES_SHOWN) as v (v.id)}
								<tr class="border-t">
									<td class="py-1.5 pr-3">
										<a class="font-medium" href={`/admin/venues/${v.id}`}>{v.name}</a>
										{#if v.primary}<span class="text-primary-darker ml-1 text-xs">main food</span>{/if}
									</td>
									<td class="text-muted-foreground py-1.5 pr-3">{v.district ?? '—'}</td>
									<td class="text-muted-foreground py-1.5 pr-3 text-xs">
										{v.viaKey === key ? '' : `${v.viaLabel} · `}{SOURCE[v.source]}
									</td>
									<td class="py-1.5 pr-3 text-right tabular-nums">{v.posts || '—'}</td>
									<td class="py-1.5 text-right text-xs tabular-nums">
										{v.rating ? `${v.rating.toFixed(1)} ★ · ${v.reviewsCount ?? 0}` : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if data.venues.length > VENUES_SHOWN}
					<Button size="sm" variant="ghost" class="mt-2" onclick={() => (allVenues = !allVenues)}>
						{allVenues ? 'Show fewer' : `Show all ${data.venues.length}`}
					</Button>
				{/if}
			{/if}
		</AdminPanel>
	{/if}
</div>

{#if data}
	<FoodTopicFormDialog
		bind:active={editing}
		topic={{
			id: data.id,
			key: data.row.key,
			label: data.row.label,
			kind: data.row.kind,
			parentKey: data.parent?.key,
			aliases: data.aliases,
			trendsTopicId: data.trendsTopicId,
			trendsQuery: data.trendsQuery
		}}
		topics={allTopics}
		onSaved={() => load()} />
{/if}
