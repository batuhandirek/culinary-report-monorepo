<script lang="ts">
	import { ArrowUpRight, X } from '@lucide/svelte';
	import type {
		AdminThemeInsightOutputDto,
		AdminThemePointOutputDto,
		GetThemeInsightParamsKindEnum,
		GetThemeInsightParamsSideEnum
	} from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDay } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import MonthChart from '#components/charts/MonthChart.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api, isNotFoundError } from '#lib/api.js';
	import { lastMonth, monthLabel, PLATFORM_LABELS, recentMonths, TOPIC_LABELS } from '#lib/culinary.js';
	import { amountLabel, themeLabel, themeRowHref, type ThemeSide } from '#lib/feedback.js';
	import { topicHref } from '#lib/topic-format.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// One feedback theme ("Price increase") in a city's month: what guests criticised, praised or
	// noticed had changed under it, over six months, where it came up, about which dishes and
	// kinds of food, the numbers they stated, and every sentence filed under it with the review or
	// post it came from. A brand, dish or kind of food on the right narrows the sentences (never
	// the figures); everything picked is in the URL, defaults left out.
	const theme = $derived(decodeURIComponent(page.params.theme ?? ''));

	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(
		param('cityId') ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const month = $derived(param('month') ?? lastMonth());
	const SIDES: { value: ThemeSide; label: string }[] = [
		{ value: 'complaints', label: 'Complaints' },
		{ value: 'praise', label: 'Praise' },
		{ value: 'changes', label: 'Noticed changes' }
	];
	const side = $derived<ThemeSide>(SIDES.find((s) => s.value === param('side'))?.value ?? 'complaints');
	const kind = $derived(['review', 'post'].includes(param('kind') ?? '') ? param('kind') : undefined);
	const brandId = $derived(param('brandId'));
	const dish = $derived(param('dish'));
	const food = $derived(param('food'));
	const filtered = $derived(!!(kind || brandId || dish || food));

	const setParams = (values: Record<string, string | undefined>) => {
		const url = new URL(page.url.href);
		for (const [name, value] of Object.entries(values)) {
			if (value) url.searchParams.set(name, value);
			else url.searchParams.delete(name);
		}
		goto(url, { replace: true, reset: false });
	};
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));

	const PAGE = 50;
	interface Query {
		theme: string;
		cityId: string;
		month: string;
		side: ThemeSide;
		kind?: string;
		brandId?: string;
		dish?: string;
		food?: string;
	}
	const fetchPage = (q: Query, offset: number) =>
		api.admin.getThemeInsight(q.theme, {
			cityId: q.cityId,
			month: q.month,
			...(q.side !== 'complaints' && { side: q.side as GetThemeInsightParamsSideEnum }),
			...(q.kind && { kind: q.kind as GetThemeInsightParamsKindEnum }),
			...(q.brandId && { brandId: q.brandId }),
			...(q.dish && { dish: q.dish }),
			...(q.food && { food: q.food }),
			offset,
			limit: PAGE
		});
	let data = $state<AdminThemeInsightOutputDto | null>(null);
	let points = $state<AdminThemePointOutputDto[]>([]);
	const loader = createLoader((q: Query) => fetchPage(q, 0), {
		onSuccess: (res) => {
			data = res;
			points = res.points;
		}
	});
	const moreLoader = createLoader((q: Query, offset: number) => fetchPage(q, offset), {
		onSuccess: (res) => (points = [...points, ...res.points])
	});
	const query = $derived<Query | null>(cityId ? { theme, cityId, month, side, kind, brandId, dish, food } : null);
	// A new theme, city, month or side starts from the skeleton; a filter keeps the figures up
	let frame = '';
	$effect(() => {
		if (!query) return;
		const next = `${query.theme}|${query.cityId}|${query.month}|${query.side}`;
		if (next !== frame) {
			data = null;
			frame = next;
		}
		loader.load(query);
	});

	// Only wait and price points state a number (minutes, euro)
	const statesNumbers = $derived(!!data && (data.amounts.length > 0 || data.topic === 'wait' || data.topic === 'price'));
	const monthName = $derived(monthLabel(month));
	const prevName = $derived(data ? monthLabel(data.previous).split(' ')[0] : '');
	const selected = $derived(data ? data.months.findIndex((m) => m.month === month) : 0);
	const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
	const pointsChange = (pt: number | null) =>
		pt === null ? null : `${pt > 0 ? '+' : pt < 0 ? '−' : '±'}${Math.abs(pt).toFixed(1)} pt on ${prevName}`;
	// Rising complaints read bad, rising praise good, changes neither
	const changeTone = (pt: number | null) =>
		!pt || side === 'changes'
			? 'text-muted-foreground'
			: (pt > 0) === (side === 'complaints')
				? 'text-destructive'
				: 'text-success';
	const sideTone = $derived(side === 'complaints' ? 'text-destructive' : side === 'praise' ? 'text-success' : 'text-ink');
	const REVIEW_PLATFORMS: Record<string, string> = { google: 'Google', tripadvisor: 'TripAdvisor' };
	const sourceLabel = (p: AdminThemePointOutputDto) =>
		p.kind === 'review'
			? `${p.stars ? `${p.stars}★ ` : ''}${REVIEW_PLATFORMS[p.reviewPlatform ?? 'google'] ?? p.reviewPlatform} review`
			: `${PLATFORM_LABELS[p.postPlatform ?? ''] ?? 'Social'} post${p.author ? ` by @${p.author}` : ''}`;
	const sourceHref = (p: AdminThemePointOutputDto) =>
		p.kind === 'post'
			? `/admin/posts/${p.sourceId}`
			: `/admin/brands/${p.brand.id}?tab=reviews&cityId=${cityId}&month=${p.at.slice(0, 7)}`;

	// The active filters, each with what clears it
	const brandName = $derived(data?.brands.find((b) => b.id === brandId)?.name ?? points.find((p) => p.brand.id === brandId)?.brand.name);
	const dishName = $derived(data?.dishes.find((d) => d.key === dish)?.label ?? dish?.replace(/^(topic|dish):/, ''));
	const foodName = $derived(data?.foods.find((f) => f.key === food)?.label ?? food);
	const chips = $derived(
		(
			[
				[kind, kind === 'review' ? 'Reviews only' : 'Posts only', 'kind'],
				[brandId, `At ${brandName ?? 'one brand'}`, 'brandId'],
				[dish, `About ${dishName}`, 'dish'],
				[food, `${foodName} places`, 'food']
			] as const
		)
			.filter(([value]) => value)
			.map(([, label, name]) => ({ label, clear: { [name]: undefined } }))
	);
	const clearAll = { kind: undefined, brandId: undefined, dish: undefined, food: undefined };
</script>

{#snippet figure(eyebrow: string, value: string, lines: { text: string; tone?: string }[])}
	<div class="bg-paper border-line rounded-md border p-4">
		<p class="eyebrow text-muted-foreground m-0">{eyebrow}</p>
		<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">{value}</p>
		{#each lines as line (line.text)}
			<p class={['m-0 text-xs', line.tone ?? 'text-muted-foreground']}>{line.text}</p>
		{/each}
	</div>
{/snippet}

{#snippet pick(label: string, count: string, active: boolean, onclick: () => void, title?: string)}
	<button
		type="button"
		class={['hover:bg-sand flex min-w-0 flex-1 justify-between gap-3 rounded px-1.5 py-1 text-left', active && 'bg-tint font-medium']}
		aria-pressed={active}
		{title}
		{onclick}>
		<span class="min-w-0 truncate">{label}</span>
		<span class="text-muted-foreground shrink-0 tabular-nums">{count}</span>
	</button>
{/snippet}

<AdminPageHeader title={data?.label ?? themeLabel(theme)}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">Theme{data ? ` · ${TOPIC_LABELS[data.topic] ?? data.topic}` : ''}</span>
	{/snippet}
	{#snippet belowTitle()}
		{#if data}
			<p class="text-muted-foreground m-0 mt-1.5 max-w-3xl text-sm">
				Covers {data.hint}. Praised and criticised points are filed here by what they are about, never by whether
				it was good or bad.
				<a class="text-beet" href={themeRowHref(theme, side === 'praise' ? 'praise' : 'complaints', { cityId, month })}>All themes</a>
			</p>
		{/if}
	{/snippet}
	{#snippet rightTitle()}
		<div class="flex items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setParams({ cityId: v })} />
				</div>
			{/if}
			<div class="w-44">
				<Select
					items={MONTHS}
					value={month}
					aria-label="Month"
					size="sm"
					onValueChange={(v) => setParams({ month: v === lastMonth() ? undefined : v })} />
			</div>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	{#if loader.error && !data}
		{#if isNotFoundError(loader.error)}
			<EmptyState title="No such theme" hint="The vocabulary has no theme by this name: it may have been renamed or removed.">
				<Button size="sm" variant="outline" href={themeRowHref(theme, 'complaints', { cityId, month })}>All themes</Button>
			</EmptyState>
		{:else}
			<ErrorState onRetry={() => query && loader.load(query)} />
		{/if}
	{:else if !data}
		<AdminPanel><SkeletonRows count={8} lines={2} trailing /></AdminPanel>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap gap-1.5" role="group" aria-label="Side">
				{#each SIDES as s (s.value)}
					{@const count = data.sides.find((c) => c.side === s.value)}
					<button
						type="button"
						class="chip text-xs"
						aria-pressed={side === s.value}
						onclick={() => setParams({ side: s.value === 'complaints' ? undefined : s.value, ...clearAll })}>
						{s.label}{#if count} · {(count.reviews + count.posts).toLocaleString('en-GB')}{/if}
					</button>
				{/each}
			</div>
			{#if side !== 'changes'}
				<div class="flex flex-wrap gap-1.5" role="group" aria-label="Source">
					{#each [{ value: undefined, label: 'Reviews and posts' }, { value: 'review', label: 'Reviews' }, { value: 'post', label: 'Posts' }] as k (k.label)}
						<button type="button" class="chip text-xs" aria-pressed={kind === k.value} onclick={() => setParams({ kind: k.value })}>
							{k.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class={['grid grid-cols-1 gap-3 sm:grid-cols-2', statesNumbers ? 'xl:grid-cols-4' : 'xl:grid-cols-3']}>
			{@render figure(`Written reviews · ${monthName}`, data.current.reviews ? data.current.reviews.toLocaleString('en-GB') : '—', [
				...(data.current.reviewShare !== null && data.current.reviews ? [{ text: `${data.current.reviewShare.toFixed(1)} % of written reviews` }] : []),
				...(data.current.reviews && pointsChange(data.current.reviewShareChange)
					? [{ text: pointsChange(data.current.reviewShareChange)!, tone: changeTone(data.current.reviewShareChange) }]
					: [])
			])}
			{#if side === 'changes'}
				{@render figure('Posts by others', '—', [{ text: 'Only reviews compare with an earlier visit' }])}
			{:else}
				{@render figure(`Posts by others · ${monthName}`, data.current.posts ? data.current.posts.toLocaleString('en-GB') : '—', [
					...(data.current.postShare !== null && data.current.posts ? [{ text: `${data.current.postShare.toFixed(1)} % of posts by others` }] : []),
					...(data.current.posts && pointsChange(data.current.postShareChange)
						? [{ text: pointsChange(data.current.postShareChange)!, tone: changeTone(data.current.postShareChange) }]
						: [])
				])}
			{/if}
			{@render figure('Brands', data.current.brands ? String(data.current.brands) : '—', [{ text: 'it came up at this month' }])}
			{#if data.amounts.length}
				{@const a = data.amounts[0]}
				{@render figure(`Stated · ${a.unit === 'minutes' ? 'wait' : 'price'}`, `median ${amountLabel(a.median, a.unit)}`, [
					{ text: `${plural(a.sources, 'review or post', 'reviews and posts')} gave a number` },
					...(a.sources > 1 ? [{ text: `from ${amountLabel(a.min, a.unit)} to ${amountLabel(a.max, a.unit)}` }] : []),
					...data.amounts.slice(1).map((b) => ({ text: `also ${plural(b.sources, 'source')} in ${b.unit === 'minutes' ? 'minutes' : 'euro'}` }))
				])}
			{:else if statesNumbers}
				{@render figure('Stated', '—', [{ text: 'No sentence states a wait or a price' }])}
			{/if}
		</div>

		<div class={['grid grid-cols-1 items-start gap-5', side !== 'changes' && 'xl:grid-cols-2']}>
			<MonthChart
				title="Share of written reviews"
				note={side === 'changes'
					? 'Of the month’s written reviews with any point or noticed change.'
					: 'Of the month’s written reviews with any praise or complaint point. Reviews are scraped for report venues and their competitors only.'}
				months={data.months.map((m) => m.month)}
				values={data.months.map((m) => m.reviewShare)}
				kind="column"
				format={(v) => `${v.toFixed(1)} %`}
				venueName={data.label}
				{selected}
				onSelect={(i) => setParams({ month: data && data.months[i].month !== lastMonth() ? data.months[i].month : undefined })} />
			{#if side !== 'changes'}
				<MonthChart
					title="Share of posts by others"
					note="Of the month’s posts by others with any point about a matched brand. Own posts are left out."
					months={data.months.map((m) => m.month)}
					values={data.months.map((m) => m.postShare)}
					kind="column"
					format={(v) => `${v.toFixed(1)} %`}
					venueName={data.label}
					{selected}
					onSelect={(i) => setParams({ month: data && data.months[i].month !== lastMonth() ? data.months[i].month : undefined })} />
			{/if}
		</div>

		<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
			<AdminPanel
				title="What they said"
				note={`${plural(data.total, 'sentence')} from ${plural(data.totalSources, 'review or post', 'reviews and posts')} · ${monthName}`}>
				{#if chips.length}
					<div class="mb-2 flex flex-wrap items-center gap-1.5">
						{#each chips as chip (chip.label)}
							<button type="button" class="chip flex items-center gap-1 text-xs" aria-pressed="true" onclick={() => setParams(chip.clear)}>
								{chip.label}<X class="size-3.5" aria-label="Clear" />
							</button>
						{/each}
						{#if chips.length > 1}
							<Button size="sm" variant="ghost" onclick={() => setParams(clearAll)}>Clear all</Button>
						{/if}
					</div>
				{/if}
				{#if !points.length}
					<EmptyState
						title={filtered ? 'No sentence matches' : `Nothing filed here in ${monthName}`}
						hint={filtered
							? 'No sentence of this side matches every filter. Clear one to see more.'
							: 'No written review or post by others of the month has a point of this side under this theme.'}
						ground="none"
						size="sm" />
				{:else}
					<ul class={['divide-line m-0 flex list-none flex-col divide-y p-0 text-sm', loader.loading && 'opacity-60']}>
						{#each points as p (p.id)}
							<li class="flex flex-col gap-1 py-2.5">
								<p class="m-0">
									<span class={sideTone}>“{p.detail}”</span>
									{#if p.amount !== undefined && p.unit}
										<span class="text-ink ml-1 text-xs font-semibold tabular-nums">{amountLabel(p.amount, p.unit)}</span>
									{/if}
								</p>
								<p class="text-muted-foreground m-0 flex flex-wrap items-baseline gap-x-1.5 text-xs">
									<a class="text-ink font-medium hover:underline" href={`/admin/brands/${p.brand.id}?cityId=${cityId}&month=${month}`}>{p.brand.name}</a>
									{#if p.venue && p.venue.name !== p.brand.name}
										<span>·</span><a class="hover:underline" href={`/admin/venues/${p.venue.id}`}>{p.venue.name}</a>
									{/if}
									<span>·</span><a class="hover:underline" href={sourceHref(p)}>{sourceLabel(p)}</a>
									<span>·</span><span>{onDay(p.at)}</span>
									{#if p.dish}
										<span>·</span>
										{#if p.foodTopic}
											<a class="text-beet hover:underline" href={topicHref(p.foodTopic.key)} title={p.foodTopic.label}>{p.dish}</a>
										{:else}
											<span title="Linked to no food topic">{p.dish}</span>
										{/if}
									{/if}
								</p>
								{#if p.text || p.summary}
									<details class="text-xs">
										<summary class="text-muted-foreground cursor-pointer select-none">
											{p.kind === 'review' ? 'The review' : 'What the post says about it'}
										</summary>
										<p class="m-0 mt-1 whitespace-pre-line">{p.text ?? p.summary}{p.text && p.text.length >= 400 ? '…' : ''}</p>
									</details>
								{/if}
							</li>
						{/each}
					</ul>
					{#if points.length < data.total}
						<Button
							size="sm"
							variant="ghost"
							class="mt-2"
							disabled={moreLoader.loading}
							onclick={() => query && moreLoader.load(query, points.length)}>
							Show {Math.min(PAGE, data.total - points.length)} more of {(data.total - points.length).toLocaleString('en-GB')}
						</Button>
					{/if}
				{/if}
			</AdminPanel>

			<div class="flex min-w-0 flex-col gap-5">
				<AdminPanel title="Where it came up most" note="tap to narrow">
					{#if data.brands.length}
						<ul class="m-0 flex list-none flex-col p-0 text-sm">
							{#each data.brands as b (b.id)}
								<li class="flex">
									{@render pick(b.name, plural(b.sources, 'time'), brandId === b.id, () => setParams({ brandId: brandId === b.id ? undefined : b.id }))}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-muted-foreground m-0 text-sm">Nowhere this month.</p>
					{/if}
				</AdminPanel>
				<AdminPanel title="By dish" note="a food topic's dishes as one">
					{#if data.dishes.length}
						<ul class="m-0 flex list-none flex-col p-0 text-sm">
							{#each data.dishes as d (d.key)}
								<li class="flex items-center gap-1">
									{@render pick(d.label, String(d.sources), dish === d.key, () => setParams({ dish: dish === d.key ? undefined : d.key }), 'Reviews and posts about it')}
									{#if d.foodTopic}
										<a class="text-beet shrink-0 p-1" href={topicHref(d.foodTopic)} aria-label={`${d.label}: the food topic's page`} title="The food topic's page">
											<ArrowUpRight class="size-3.5" />
										</a>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-muted-foreground m-0 text-sm">No sentence named a dish.</p>
					{/if}
				</AdminPanel>
				{#if data.foods.length}
					<AdminPanel title="By kind of food" note="of its brands' reviews and posts">
						<ul class="m-0 flex list-none flex-col p-0 text-sm">
							{#each data.foods as f (f.key)}
								<li class="flex">
									{@render pick(
										f.label,
										`${f.sources} · ${f.share.toFixed(1)} %`,
										food === f.key,
										() => setParams({ food: food === f.key ? undefined : f.key }),
										'Its brands’ reviews and posts raising it, and their share of all its brands’ reviews and posts with a point'
									)}
								</li>
							{/each}
						</ul>
					</AdminPanel>
				{/if}
			</div>
		</div>
	{/if}
</div>
