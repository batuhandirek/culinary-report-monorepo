<script lang="ts">
	import { CloudDownload, ExternalLink, Image, RefreshCw } from '@lucide/svelte';
	import type { AdminCityOutputDto, AdminFoodTrendsOutputDto } from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { at } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { cityItems } from '#lib/admin-cities.js';
	import { api } from '#lib/api.js';
	import { foodTrendsPath, quarterLabel, recentQuarters } from '#lib/food-trends.js';
	import { HIGHLIGHT_CARDS } from '#lib/highlights.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';
	import FoodTrendsView from '#views/food-trends/FoodTrendsView.svelte';

	// A city's public quarter of food trends (`/<city>/trends/<YYYY>-q<N>`): pull the anchored
	// Google searches (paid, about a cent a kind of food), build from what is stored, check it here
	// as the page will show it, publish it, take it down. Never automatic. The city's do-not-list
	// (Public highlights) applies to Google's rising queries too.
	adminCitiesStore.load();
	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const cityId = $derived(
		param('cityId') ?? (adminCitiesStore.list.find((c) => c.active) ?? adminCitiesStore.list[0])?.id
	);
	const QUARTERS = recentQuarters(6);
	const quarter = $derived(param('quarter') ?? QUARTERS[0]);
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};
	const QUARTER_ITEMS = QUARTERS.map((q) => ({ value: q, label: quarterLabel(q) }));

	let loaded = $state<AdminFoodTrendsOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; quarter: string }) => api.admin.getFoodTrends(query),
		{ onSuccess: (res) => (loaded = res as AdminFoodTrendsOutputDto) }
	);
	const reload = () => cityId && loader.load({ cityId, quarter });
	$effect(() => {
		loaded = null;
		reload();
	});

	let city = $state<AdminCityOutputDto | null>(null);
	$effect(() => {
		if (!cityId) return;
		city = null;
		api.admin.getCity(cityId).then((res) => (city = res as AdminCityOutputDto));
	});

	const report = $derived(loaded?.report);
	const pull = $derived(report?.searchPull);
	const pulling = $derived(pull?.state === 'queued' || pull?.state === 'running');
	// A pull runs in the background for minutes: look again until it is done
	$effect(() => {
		if (!pulling) return;
		const timer = setInterval(reload, 10_000);
		return () => clearInterval(timer);
	});
	const publicHref = $derived(city ? foodTrendsPath(city.slug, quarter) : '');

	const pullSearches = createAction(() => api.admin.pullFoodTrendsSearches({ cityId: cityId!, quarter }), {
		onSuccess: reload,
		successNotification: { title: 'Pull queued. It takes a few minutes' }
	});
	const build = createAction(() => api.admin.buildFoodTrends({ cityId: cityId!, quarter }), {
		onSuccess: reload,
		successNotification: { title: 'Built from the current data' }
	});
	const publish = createAction((id: string) => api.admin.publishFoodTrends(id), {
		onSuccess: reload,
		successNotification: (_res, [id]) => ({
			title: 'Published',
			action: { label: 'Undo', onClick: () => unpublish.execute(id) }
		})
	});
	const unpublish = createAction((id: string) => api.admin.unpublishFoodTrends(id), {
		onSuccess: reload,
		successNotification: { title: 'Taken off the site' }
	});
</script>

<AdminPageHeader
	title="Food trends report"
	description="A city's quarter in public: searches on one scale across kinds of food and against a year earlier, Google's rising queries, the kinds of food posts named, new places by kind of food. Published by hand.">
	{#snippet rightTitle()}
		<div class="flex items-center gap-2">
			{#if adminCitiesStore.list.length > 1}
				<div class="w-40">
					<Select items={cityItems(adminCitiesStore.list)} value={cityId} aria-label="City" size="sm" onValueChange={(v) => setParam('cityId', v)} />
				</div>
			{/if}
			<div class="w-36">
				<Select items={QUARTER_ITEMS} value={quarter} aria-label="Quarter" size="sm" onValueChange={(v) => setParam('quarter', v === QUARTERS[0] ? undefined : v)} />
			</div>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="grid min-w-0 grid-cols-1 items-start gap-5 pb-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
	<div class="flex min-w-0 flex-col gap-5">
		<AdminPanel title={`${city?.name ?? 'City'} · ${quarterLabel(quarter)}`}>
			{#snippet action()}
				{#if report?.publishedAt}
					<Badge variant="success">Published</Badge>
				{:else if report?.data}
					<Badge variant="quiet">Not published</Badge>
				{/if}
			{/snippet}
			{#if loader.error && !loaded}
				<ErrorState onRetry={reload} ground="none" size="sm" />
			{:else if !loaded}
				<SkeletonRows count={2} lines={1} boxed={false} />
			{:else}
				<div class="flex flex-col gap-4">
					<p class="text-muted-foreground m-0 text-sm">
						{#if report?.builtAt}
							Built {at(report.builtAt)}{report.publishedAt ? `, published ${at(report.publishedAt)}` : ''}.
							A pull or a correction since needs a rebuild to show.
						{:else}
							Not built yet. Building is free: it reads the quarter's posts, Google's rising
							queries, the openings and the pulled searches as they stand now.
						{/if}
					</p>
					<div class="flex flex-wrap items-center gap-2">
						{#if report?.data && !report.publishedAt}
							<Button onclick={() => publish.execute(report.id)} loading={publish.executing}>Publish</Button>
						{/if}
						<Button variant="outline" icon={RefreshCw} onclick={() => build.execute()} loading={build.executing}>
							{report?.data ? 'Rebuild' : 'Build'}
						</Button>
						{#if report?.publishedAt}
							<Button variant="outline" icon={ExternalLink} href={publicHref} newTab>Open the page</Button>
							<Button variant="ghost" onclick={() => unpublish.execute(report.id)} loading={unpublish.executing}>
								Unpublish
							</Button>
						{/if}
					</div>
					{#if report?.publishedAt}
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
							<span class="text-muted-foreground">Share images:</span>
							{#each Object.entries(HIGHLIGHT_CARDS) as [card, info] (card)}
								<a href={`${publicHref}/${card}.png`} target="_blank" rel="noopener" class="text-beet inline-flex min-h-11 items-center gap-1 hover:underline">
									<Image class="size-4" aria-hidden="true" />{info.label} ({info.width}×{info.height})
								</a>
							{/each}
						</div>
					{:else if report?.data}
						<p class="text-muted-foreground m-0 text-xs">The page and its share images go live with the publish.</p>
					{/if}
				</div>
			{/if}
		</AdminPanel>

		{#if loaded && report?.data && city}
			{#if !report.data.searches}
				<Notice
					tone="info"
					title="No searches on the page yet"
					text="The search sections need the anchored pull (Searches, on the right). Without it the page shows posts, Google's rising queries and new places." />
			{/if}
			<div class="bg-sand border-line overflow-hidden rounded-md border">
				<FoodTrendsView {city} {quarter} data={report.data} />
			</div>
		{:else if loaded && !report?.data}
			<EmptyState title="Nothing built for this quarter" hint="Build it to see the page before anyone else does." size="sm">
				<Button onclick={() => build.execute()} loading={build.executing}>Build</Button>
			</EmptyState>
		{/if}
	</div>

	<AdminPanel title="Searches">
		<div class="flex flex-col gap-4">
			<p class="text-muted-foreground m-0 text-sm">
				Google Trends over the two years to the quarter's end, every kind of food with a Trends id
				in groups of five that all carry pizza, so they land on one scale and compare with a year
				earlier. Paid: one Apify run a group.
			</p>
			{#if loaded}
				<p class="text-ink m-0 text-sm">
					{loaded.pull.topics} kinds of food in {loaded.pull.groups} groups, about ${loaded.pull.estimatedUsd.toFixed(2)}.
				</p>
			{/if}
			{#if pull}
				<p class="m-0 text-sm" class:text-muted-foreground={pull.state !== 'failed'} class:text-ink={pull.state === 'failed'}>
					{#if pulling}
						{pull.state === 'queued' ? 'Queued' : 'Pulling'} since {at(pull.requestedAt)}…
					{:else if pull.state === 'done'}
						Pulled {at(pull.finishedAt ?? pull.requestedAt)}: {pull.note}.
					{:else}
						Failed {at(pull.finishedAt ?? pull.requestedAt)}: {pull.note}
					{/if}
				</p>
			{/if}
			<div class="flex">
				<Button
					variant="outline"
					icon={CloudDownload}
					onclick={() => pullSearches.execute()}
					loading={pullSearches.executing || pulling}
					disabled={!loaded || pulling}>
					{pull?.state === 'done' ? 'Pull again' : 'Pull searches'}
				</Button>
			</div>
		</div>
	</AdminPanel>
</div>
