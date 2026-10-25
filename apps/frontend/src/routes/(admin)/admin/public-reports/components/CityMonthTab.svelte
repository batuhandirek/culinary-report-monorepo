<script lang="ts">
	import { ExternalLink, Image, RefreshCw } from '@lucide/svelte';
	import type { AdminCityHighlightsOutputDto, AdminCityOutputDto } from 'client';

	import { at } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { HIGHLIGHT_CARDS, highlightPath } from '#lib/highlights.js';
	import { TagsInput } from '#ui/components/tags-input/index.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';
	import CityHighlightView from '#views/highlights/CityHighlightView.svelte';

	// A city's public month (`/<city>/<month>`): build it from what is stored now, check it here
	// as the page will show it, publish it, take it down. Never automatic: a wrong match in
	// public is worse than a late page. The do-not-list of the city sits beside it.
	interface Props {
		cityId: string;
		month: string;
	}
	let { cityId, month }: Props = $props();

	let loaded = $state<AdminCityHighlightsOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; month: string }) => api.admin.getCityHighlights(query),
		{ onSuccess: (res) => (loaded = res as AdminCityHighlightsOutputDto) }
	);
	const reload = () => loader.load({ cityId, month });
	$effect(() => {
		loaded = null;
		reload();
	});

	let city = $state<AdminCityOutputDto | null>(null);
	let venues = $state<string[]>([]);
	let creators = $state<string[]>([]);
	$effect(() => {
		city = null;
		api.admin.getCity(cityId).then((res) => {
			city = res as AdminCityOutputDto;
			venues = [...city.doNotListVenues];
			creators = [...city.doNotListCreators];
		});
	});

	const highlight = $derived(loaded?.highlight);
	// The month is over on the first of the next, UTC: only then can it go out
	const monthOver = $derived(
		new Date(`${month}-01T00:00:00Z`).getTime() <
			Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
	);
	const publicHref = $derived(city ? highlightPath(city.slug, month) : '');

	const build = createAction(() => api.admin.buildCityHighlight({ cityId, month }), {
		onSuccess: reload,
		successNotification: { title: 'Built from the current data' }
	});
	const publish = createAction((id: string) => api.admin.publishCityHighlight(id), {
		onSuccess: reload,
		successNotification: (_res, [id]) => ({
			title: 'Published',
			action: { label: 'Undo', onClick: () => unpublish.execute(id) }
		})
	});
	const unpublish = createAction((id: string) => api.admin.unpublishCityHighlight(id), {
		onSuccess: reload,
		successNotification: { title: 'Taken off the site' }
	});
	const saveDoNotList = createAction(
		() =>
			api.admin.updateCity(cityId, { doNotListVenues: venues, doNotListCreators: creators }),
		{
			onSuccess: (res) => (city = res as AdminCityOutputDto),
			successNotification: { title: 'Saved. Rebuild the month to apply it' }
		}
	);
	const listChanged = $derived(
		!!city &&
			(venues.join('\n') !== city.doNotListVenues.join('\n') ||
				creators.join('\n') !== city.doNotListCreators.join('\n'))
	);
</script>

<p class="text-muted-foreground m-0 mb-4 text-sm">
	The city's month in public: the most talked-about places, the climbers, the most viewed post and
	the creators. Built from stored data, published by hand.
</p>

<div class="grid min-w-0 grid-cols-1 items-start gap-5 pb-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
	<div class="flex min-w-0 flex-col gap-5">
		<AdminPanel title={`${city?.name ?? 'City'} · ${monthLabel(month)}`}>
			{#snippet action()}
				{#if highlight?.publishedAt}
					<Badge variant="success">Published</Badge>
				{:else if highlight}
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
						{#if highlight}
							Built {at(highlight.builtAt)}{highlight.publishedAt
								? `, published ${at(highlight.publishedAt)}`
								: ''}. A mention corrected since needs a rebuild to show.
						{:else}
							Not built yet. Building reads the month's matched posts as they stand
							now.
						{/if}
					</p>
					<div class="flex flex-wrap items-center gap-2">
						{#if highlight && !highlight.publishedAt}
							<Button
								onclick={() => publish.execute(highlight.id)}
								loading={publish.executing}
								disabled={!monthOver}
								title={monthOver ? undefined : 'A month goes out once it is over'}
							>
								Publish
							</Button>
						{/if}
						<Button
							variant="outline"
							icon={RefreshCw}
							onclick={() => build.execute()}
							loading={build.executing}
						>
							{highlight ? 'Rebuild' : 'Build'}
						</Button>
						{#if highlight?.publishedAt}
							<Button variant="outline" icon={ExternalLink} href={publicHref} newTab
								>Open the page</Button
							>
							<Button
								variant="ghost"
								onclick={() => unpublish.execute(highlight.id)}
								loading={unpublish.executing}
							>
								Unpublish
							</Button>
						{/if}
					</div>
					{#if highlight?.publishedAt}
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
							<span class="text-muted-foreground">Share images:</span>
							{#each Object.entries(HIGHLIGHT_CARDS) as [card, info] (card)}
								<a
									href={`${publicHref}/${card}.png`}
									target="_blank"
									rel="noopener"
									class="text-beet inline-flex min-h-11 items-center gap-1 hover:underline"
								>
									<Image class="size-4" aria-hidden="true" />{info.label} ({info.width}×{info.height})
								</a>
							{/each}
						</div>
					{:else if highlight}
						<p class="text-muted-foreground m-0 text-xs">
							The page and its share images go live with the publish.
						</p>
					{/if}
				</div>
			{/if}
		</AdminPanel>

		{#if loaded && highlight && city}
			{#if !highlight.data.brands.length}
				<Notice
					tone="warning"
					title="Nothing to list"
					text="No post of the month names a place of the city by someone else. Run the pipeline for the month first."
				/>
			{/if}
			<div class="bg-sand border-line overflow-hidden rounded-md border">
				<CityHighlightView {city} {month} data={highlight.data} />
			</div>
		{:else if loaded && !highlight}
			<EmptyState
				title="Nothing built for this month"
				hint="Build it to see the page before anyone else does."
				size="sm"
			>
				<Button onclick={() => build.execute()} loading={build.executing}>Build</Button>
			</EmptyState>
		{/if}
	</div>

	<AdminPanel
		title="Leave out"
		note={city ? city.doNotListVenues.length + city.doNotListCreators.length : undefined}
	>
		<div class="flex flex-col gap-4">
			<p class="text-muted-foreground m-0 text-sm">
				Places and creators who asked not to be on the public pages. Honour a request the
				same day: save, rebuild, and the published page follows.
			</p>
			<label class="flex flex-col gap-1.5 text-sm font-medium">
				Places
				<TagsInput bind:value={venues} placeholder="Venue name" />
			</label>
			<label class="flex flex-col gap-1.5 text-sm font-medium">
				Creators
				<TagsInput bind:value={creators} placeholder="@handle" />
			</label>
			<div class="flex">
				<Button
					variant="outline"
					onclick={() => saveDoNotList.execute()}
					loading={saveDoNotList.executing}
					disabled={!listChanged}
				>
					Save
				</Button>
			</div>
		</div>
	</AdminPanel>
</div>
