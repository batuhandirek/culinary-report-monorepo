<script lang="ts">
	import { ExternalLink, RefreshCw } from '@lucide/svelte';
	import type {
		AdminLandingEditionOutputDto,
		AdminLandingEditionsOutputDto,
		AdminNewsletterCountsOutputDto
	} from 'client';

	import { onDestroy } from 'svelte';

	import { at } from '#components/admin/admin-format.js';
	import AdminFacts from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The front page's live edition (`/`): the last 30 days counted and written up every five
	// days by the cron, published by itself. Here an admin sees what is live and what the model
	// wrote, builds one now, and takes one down (the newest other published edition shows
	// instead) or puts it back.
	let { cityId }: { cityId: string } = $props();

	const REFRESH_DAYS = 5;

	let loaded = $state<AdminLandingEditionsOutputDto | null>(null);
	const loader = createLoader((query: { cityId: string }) => api.admin.getLandingEditions(query), {
		onSuccess: (res) => (loaded = res as AdminLandingEditionsOutputDto)
	});
	const reload = () => loader.load({ cityId });
	$effect(() => {
		loaded = null;
		reload();
	});

	let counts = $state<AdminNewsletterCountsOutputDto | null>(null);
	$effect(() => {
		counts = null;
		api.admin.getNewsletterCounts({ cityId }).then((res) => (counts = res as AdminNewsletterCountsOutputDto));
	});

	const editions = $derived(loaded?.editions ?? []);
	let selectedId = $state<string | null>(null);
	const shownId = $derived(selectedId ?? loaded?.liveId ?? editions[0]?.id ?? null);
	let shown = $state<AdminLandingEditionOutputDto | null>(null);
	$effect(() => {
		const id = shownId;
		shown = null;
		if (id) api.admin.getLandingEdition(id).then((res) => (shown = res as AdminLandingEditionOutputDto));
	});

	const newest = $derived(editions[0]);
	const nextDue = $derived(
		newest ? new Date(new Date(newest.builtAt).getTime() + REFRESH_DAYS * 24 * 3600 * 1000) : null
	);
	const day = (iso: string | Date, minus = 0) =>
		new Date(new Date(iso).getTime() - minus).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
	const windowOf = (e: { windowStart: string | Date; windowEnd: string | Date }) =>
		`${day(e.windowStart)} – ${day(e.windowEnd, 1)}`;

	// A build runs as a job (a minute with the model's call): look again until a newer one is there
	let polling: ReturnType<typeof setInterval> | undefined;
	const stopPolling = () => clearInterval(polling);
	onDestroy(stopPolling);
	const build = createAction(() => api.admin.buildLandingEdition({ cityId }), {
		onSuccess: () => {
			const before = newest?.builtAt;
			let tries = 0;
			stopPolling();
			polling = setInterval(async () => {
				tries++;
				await reload();
				if ((loaded?.editions[0] && loaded.editions[0].builtAt !== before) || tries > 20) {
					stopPolling();
					selectedId = null;
				}
			}, 6000);
		},
		successNotification: { title: 'Building: the new edition shows here in a minute or two' }
	});
	const publish = createAction((id: string) => api.admin.publishLandingEdition(id), {
		onSuccess: reload,
		successNotification: { title: 'On the front page' }
	});
	const unpublish = createAction((id: string) => api.admin.unpublishLandingEdition(id), {
		onSuccess: reload,
		successNotification: (_res, [id]) => ({
			title: 'Taken off: the newest other published edition shows',
			action: { label: 'Undo', onClick: () => publish.execute(id) }
		})
	});

	const ROLES: Record<string, string> = {
		dish_of_the_month: 'Dish of the Month',
		rising: 'Still rising',
		most_named: 'Most named',
		drink: 'Drink of the moment'
	};
</script>

<p class="text-muted-foreground m-0 mb-4 text-sm">
	The front page's live edition: the places, dishes, openings and trends of the last 30 days, with
	lines the model wrote and every number checked. The cron builds one every {REFRESH_DAYS} days and it
	publishes itself; take one down here if it says something it shouldn't.
</p>

<div class="grid min-w-0 grid-cols-1 items-start gap-5 pb-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
	<div class="flex min-w-0 flex-col gap-5">
		<AdminPanel title="Front page">
			{#snippet action()}
				{#if loaded?.liveId}<Badge variant="success">Live</Badge>{:else if loaded}<Badge variant="quiet">Nothing live</Badge>{/if}
			{/snippet}
			{#if loader.error && !loaded}
				<ErrorState onRetry={reload} ground="none" size="sm" />
			{:else if !loaded}
				<SkeletonRows count={2} lines={1} boxed={false} />
			{:else}
				<div class="flex flex-col gap-4">
					<p class="text-muted-foreground m-0 text-sm">
						{#if newest}
							Last built {at(newest.builtAt)}; the next one is due {nextDue ? at(nextDue) : '—'}. A place on
							the do-not-list (City month tab) leaves with the next build.
						{:else}
							No edition yet. The cron builds the first one tonight, or build it now.
						{/if}
					</p>
					<div class="flex flex-wrap items-center gap-2">
						<Button icon={RefreshCw} onclick={() => build.execute()} loading={build.executing}>Build now</Button>
						{#if loaded.liveId}
							<Button variant="outline" icon={ExternalLink} href="/" newTab>Open the front page</Button>
						{/if}
					</div>
				</div>
			{/if}
		</AdminPanel>

		{#if loaded && editions.length}
			<AdminPanel title="Editions" note={editions.length}>
				<ul class="m-0 flex list-none flex-col p-0">
					{#each editions as edition (edition.id)}
						<li class="border-line flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-2.5 last:border-b-0">
							<button
								type="button"
								class={['min-h-11 min-w-0 flex-1 cursor-pointer text-left text-sm hover:underline', edition.id === shownId && 'font-semibold']}
								onclick={() => (selectedId = edition.id)}>
								{windowOf(edition)} <span class="text-muted-foreground font-normal">· built {at(edition.builtAt)}</span>
							</button>
							{#if edition.id === loaded.liveId}
								<Badge variant="success">Live</Badge>
							{:else if edition.publishedAt}
								<Badge variant="quiet">Published</Badge>
							{:else}
								<Badge variant="quiet">Draft</Badge>
							{/if}
							{#if edition.copyError}<Badge variant="warning">Plain lines</Badge>{/if}
							{#if edition.publishedAt}
								<Button size="sm" variant="ghost" onclick={() => unpublish.execute(edition.id)} loading={unpublish.executing}>Unpublish</Button>
							{:else}
								<Button size="sm" variant="outline" onclick={() => publish.execute(edition.id)} loading={publish.executing}>Publish</Button>
							{/if}
						</li>
					{/each}
				</ul>
			</AdminPanel>
		{:else if loaded}
			<EmptyState title="No edition yet" hint="Build one to see what the front page will say." size="sm">
				<Button onclick={() => build.execute()} loading={build.executing}>Build now</Button>
			</EmptyState>
		{/if}

		{#if shown}
			{#if shown.copyError}
				<Notice tone="warning" title="The model's call failed: every line is a plain fallback" text={shown.copyError} />
			{/if}
			<AdminPanel title={`What it says · ${windowOf(shown)}`} note={`${shown.copy.written} written, ${shown.copy.fallbacks} plain`}>
				<div class="flex flex-col gap-6 text-sm">
					<p class="m-0 text-base leading-relaxed">{shown.copy.lede}</p>
					<section class="flex flex-col gap-3">
						<h3 class="eyebrow text-beet m-0">Heat Check</h3>
						<ol class="m-0 flex list-none flex-col gap-3 p-0">
							{#each shown.data.places as place (place.brandId)}
								{@const line = shown.copy.places.find((p) => p.brandId === place.brandId)}
								<li class="flex flex-col gap-1">
									<span class="font-semibold">
										{place.rank}. {place.name}
										<span class="text-muted-foreground font-normal">
											· {place.creators} people · {place.posts} posts · {place.move}{place.climb ? ` ${place.climb}` : ''}{place.dish ? ` · ${place.dish.label}` : ''}
										</span>
									</span>
									{#if line}<span class="text-muted-foreground">“{line.tagline}” — {line.said}</span>{/if}
								</li>
							{/each}
						</ol>
					</section>
					{#if shown.data.dishes.length}
						<section class="flex flex-col gap-3">
							<h3 class="eyebrow text-beet m-0">Dishes</h3>
							{#each shown.data.dishes as dish (dish.key)}
								{@const line = shown.copy.dishes.find((d) => d.key === dish.key)}
								<p class="m-0"><span class="font-semibold">{ROLES[dish.role]}: {dish.label}</span> ({dish.posts} posts, {dish.delta > 0 ? '+' : ''}{dish.delta} pts){line ? ` — ${line.text}` : ''}</p>
							{/each}
						</section>
					{/if}
					{#if shown.copy.trends.length}
						<section class="flex flex-col gap-3">
							<h3 class="eyebrow text-beet m-0">Trends</h3>
							{#each shown.copy.trends as trend (trend.storyId)}
								<p class="m-0"><span class="font-semibold">{trend.title}</span> {trend.text}</p>
							{/each}
						</section>
					{/if}
					{#if shown.data.openings.length}
						<section class="flex flex-col gap-3">
							<h3 class="eyebrow text-beet m-0">New in Town ({shown.data.openingsCount} in 14 days)</h3>
							{#each shown.data.openings as opening (opening.brandId)}
								{@const line = shown.copy.openings.find((o) => o.brandId === opening.brandId)}
								<p class="m-0"><span class="font-semibold">{opening.name}</span> · first called new {day(opening.firstSeen)}{line ? ` — ${line.text}` : ''}</p>
							{/each}
						</section>
					{/if}
					<section class="flex flex-col gap-3">
						<h3 class="eyebrow text-beet m-0">Right now strip</h3>
						{#each shown.copy.ticker as item (item.storyId)}
							<p class="m-0">{item.text}</p>
						{/each}
					</section>
				</div>
			</AdminPanel>
		{/if}
	</div>

	<AdminPanel title="Newsletter">
		<div class="flex flex-col gap-4">
			<p class="text-muted-foreground m-0 text-sm">
				Addresses from the front page's form. Double opt-in: only confirmed ones may get mail. Sending the monthly
				e-mail is not built yet.
			</p>
			{#if counts}
				<AdminFacts
					items={[
						{ label: 'Confirmed', value: counts.confirmed.toLocaleString('en') },
						{ label: 'Waiting for the link', value: counts.pending.toLocaleString('en') },
						{ label: 'Unsubscribed', value: counts.unsubscribed.toLocaleString('en') }
					]} />
			{:else}
				<SkeletonRows count={3} lines={1} boxed={false} />
			{/if}
		</div>
	</AdminPanel>
</div>
