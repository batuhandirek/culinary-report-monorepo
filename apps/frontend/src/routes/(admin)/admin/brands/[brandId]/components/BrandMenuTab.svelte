<script lang="ts">
	import { Search, Utensils } from '@lucide/svelte';
	import type { AdminBrandMenuItemOutputDto, AdminBrandMenuOutputDto, AdminBrandOutputDto } from 'client';

	import { untrack } from 'svelte';

	import { onDay } from '#components/admin/admin-format.js';
	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import Pill from '#components/admin/detail/Pill.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { deliveryPlatform, etaLabel, money } from '#lib/delivery.js';
	import { exploreHref } from '#lib/explore.js';
	import { topicPageHref } from '#lib/topic-format.js';
	import { followWorkflow } from '#lib/workflow-follow.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// What the brand sells, as its pages on Wolt, Lieferando and Uber Eats list it: each branch's
	// pages with their stars and fees, and its menu, one row an item across the platforms, with what
	// each costs where, the kind of food it is, and the reviews and posts that name it. An item a
	// platform stopped listing stays, marked. "Find menus" searches for the pages again and reads
	// them (the month's run does it for the top brands).
	interface Props {
		brand: AdminBrandOutputDto;
		cityId?: string;
	}

	let { brand, cityId }: Props = $props();

	let menu = $state<AdminBrandMenuOutputDto | null>(null);
	const loader = createLoader((id: string, city: string) => api.admin.getBrandMenu(id, { cityId: city }), {
		onSuccess: (res) => (menu = res)
	});
	$effect(() => {
		const id = brand.id;
		const city = cityId;
		untrack(() => {
			menu = null;
			if (city) loader.load(id, city);
		});
	});

	const branches = $derived(menu?.branches ?? []);
	let branchId = $state<string | undefined>(undefined);
	$effect(() => {
		// A branch with a menu first: the most reviewed one may be on no platform
		if (!branches.some((b) => b.venueId === branchId))
			branchId = (branches.find((b) => b.items.length) ?? branches[0])?.venueId;
	});
	const BRANCHES = $derived(
		branches.map((b) => ({
			value: b.venueId,
			label: `${[b.name, b.street].filter(Boolean).join(' · ')}${b.listings.length ? '' : ' (no page)'}`
		}))
	);
	const branch = $derived(branches.find((b) => b.venueId === branchId));
	const platforms = $derived(branch?.listings.map((l) => l.platform) ?? []);
	const currencyOf = (platform: string) => branch?.listings.find((l) => l.platform === platform)?.currency ?? 'EUR';

	let query = $state('');
	let namedOnly = $state(false);
	const items = $derived(
		(branch?.items ?? []).filter(
			(item) =>
				(!namedOnly || item.sources > 0) &&
				(!query.trim() ||
					`${item.name} ${item.category ?? ''} ${item.wordings.map((w) => w.name).join(' ')}`
						.toLowerCase()
						.includes(query.trim().toLowerCase()))
		)
	);
	const onMenu = $derived((branch?.items ?? []).filter((item) => !item.removed).length);
	const removed = $derived((branch?.items ?? []).length - onMenu);
	const named = $derived((branch?.items ?? []).filter((item) => item.sources > 0).length);

	// A web search for its pages, then each page read: a few cents and a minute or two, followed
	// until it ends
	const findAction = createAction(
		async () => {
			if (!cityId) return;
			const { workflowId } = await api.admin.searchBrandMenus(brand.id, { cityId });
			const run = await followWorkflow(workflowId, 5 * 60_000);
			if (run.status === 'failed') throw new Error(run.error);
			if (run.status === 'still running') throw new Error('Still reading after five minutes: see its run on Workflows');
			await loader.load(brand.id, cityId);
		},
		{ successNotification: () => ({ title: 'Menus read', text: brand.name }) }
	);

	const offerOf = (item: AdminBrandMenuItemOutputDto, platform: string) => item.offers.find((o) => o.platform === platform);
	/** The price before the latest, when it moved */
	const before = (prices: { month: string; price: number }[]) => {
		const last = prices.at(-1);
		const previous = prices.findLast((p) => p.price !== last?.price);
		return last && previous ? previous : undefined;
	};
	const METHODS: Record<string, string> = { exact: 'its name', contains: 'holds its name', similar: 'a close spelling' };
	const namedHint = (item: AdminBrandMenuItemOutputDto) =>
		[
			`${item.reviews} reviews, ${item.posts} posts by others`,
			`${item.praise} praising, ${item.complaints} complaining`,
			...item.wordings.map((w) => `“${w.name}” ×${w.sources} (${METHODS[w.method] ?? w.method})`)
		].join(' · ');
</script>

<div class="flex min-w-0 flex-col gap-3">
	{#if !cityId}
		<EmptyState title="No city" hint="The brand has no branch in a city yet." size="sm" />
	{:else if loader.failed && !menu}
		<ErrorState title="Couldn't load the menu" onRetry={() => loader.reload()} />
	{:else if !menu}
		<DetailCard title="Delivery pages"><SkeletonRows count={3} lines={1} /></DetailCard>
	{:else}
		<div class="flex flex-wrap items-center gap-3 text-sm">
			{#if BRANCHES.length > 1}
				<span class="text-muted-foreground">Branch</span>
				<div class="w-80">
					<Select items={BRANCHES} bind:value={branchId} aria-label="Branch" size="sm" />
				</div>
			{/if}
			<Button variant="outline" size="sm" icon={Search} loading={findAction.executing} onclick={() => findAction.execute()}
				>Find menus</Button>
			<span class="text-muted-foreground text-xs">
				Searches Wolt, Lieferando and Uber Eats for “{brand.name}” and reads every page it finds (a few cents).
				{branch?.searchedAt ? `Last searched ${onDay(branch.searchedAt)}.` : 'Never searched.'}
			</span>
		</div>

		{#if branch}
			<DetailCard title="Delivery pages" note={branch.listings.length || undefined} flush>
				{#if branch.listings.length}
					<table class="w-full border-collapse text-[13px]">
						<thead class="text-faint text-left text-[11px]">
							<tr class="border-line/60 border-t">
								<th class="px-3.5 py-1.5 font-medium">Platform</th>
								<th class="px-2 py-1.5 font-medium">Rating</th>
								<th class="px-2 py-1.5 font-medium">Delivery</th>
								<th class="px-2 py-1.5 font-medium">Menu</th>
								<th class="px-2 py-1.5 font-medium">Listed as</th>
								<th class="px-3.5 py-1.5 text-right font-medium">Read</th>
							</tr>
						</thead>
						<tbody>
							{#each branch.listings as listing (listing.id)}
								{@const trend = listing.snapshots.filter((s) => s.rating !== undefined)}
								<tr class="border-line/60 h-8 border-t">
									<td class="px-3.5 whitespace-nowrap">
										<a href={listing.url} target="_blank" rel="noopener noreferrer" class="font-semibold"
											>{deliveryPlatform(listing.platform)}</a>
										{#if listing.removedAt}
											<Pill tone="bad" title="A read of the page came back empty: it left the platform, or its page moved"
												>not answering since {onDay(listing.removedAt)}</Pill>
										{/if}
									</td>
									<td class="px-2 whitespace-nowrap tabular-nums">
										<Tooltip
											text={trend.length > 1
												? trend.map((s) => `${monthLabel(s.month)}: ${s.rating!.toFixed(1)} ★${s.reviewsCount !== undefined ? ` (${s.reviewsCount})` : ''}`).join(' · ')
												: undefined}>
											<span
												>{listing.rating !== undefined ? `${listing.rating.toFixed(1)} ★` : '—'}{listing.reviewsCount !== undefined
													? ` · ${listing.reviewsCount.toLocaleString('en')}`
													: ''}</span>
										</Tooltip>
									</td>
									<td class="text-muted-foreground px-2 whitespace-nowrap tabular-nums">
										{[
											listing.deliveryFee !== undefined ? `${money(listing.deliveryFee, listing.currency)} fee` : undefined,
											listing.minOrder !== undefined ? `${money(listing.minOrder, listing.currency)} minimum` : undefined,
											etaLabel(listing.etaMin, listing.etaMax)
										]
											.filter(Boolean)
											.join(' · ') || '—'}
									</td>
									<td class="px-2 whitespace-nowrap tabular-nums">
										{listing.items} items{listing.removedItems ? `, ${listing.removedItems} removed` : ''}
									</td>
									<td class="text-muted-foreground max-w-0 truncate px-2" style="width: 34%" title={[listing.name, listing.address, listing.cuisines?.join(', ')].filter(Boolean).join(' · ')}>
										{[listing.name, listing.address].filter(Boolean).join(' · ') || '—'}
									</td>
									<td class="text-muted-foreground px-3.5 text-right whitespace-nowrap">{onDay(listing.fetchedAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<div class="px-3.5 pb-3">
						<EmptyState
							title={branch.searchedAt ? 'On no delivery platform we read' : 'Not searched yet'}
							hint={branch.searchedAt
								? `No page of it was found on Wolt, Lieferando or Uber Eats on ${onDay(branch.searchedAt)}.`
								: 'The month’s run reads the menus of the top brands and their competitors; “Find menus” reads this brand’s now.'}
							ground="none"
							size="sm" />
					</div>
				{/if}
			</DetailCard>

			{#if branch.items.length}
				<DetailCard
					title="Menu"
					icon={Utensils}
					note={`${onMenu} items${removed ? `, ${removed} removed` : ''} · ${named} named in reviews or posts`}
					flush>
					{#snippet aside()}
						<label class="text-muted-foreground flex items-center gap-1.5">
							<input type="checkbox" bind:checked={namedOnly} class="accent-ink" /> Named only
						</label>
						<input
							type="search"
							bind:value={query}
							placeholder="Filter items"
							aria-label="Filter items"
							class="border-line h-7 w-40 rounded-md border bg-white px-2 text-xs" />
					{/snippet}
					<table class="w-full border-collapse text-[13px]">
						<thead class="text-faint text-left text-[11px]">
							<tr class="border-line/60 border-t">
								<th class="px-3.5 py-1.5 font-medium">Item</th>
								<th class="px-2 py-1.5 font-medium">Section</th>
								<th class="px-2 py-1.5 font-medium">Kind of food</th>
								{#each platforms as platform (platform)}
									<th class="px-2 py-1.5 text-right font-medium">{deliveryPlatform(platform)}</th>
								{/each}
								<th class="px-3.5 py-1.5 text-right font-medium">Named by</th>
							</tr>
						</thead>
						<tbody>
							{#each items as item (item.key)}
								<tr class={['border-line/60 h-8 border-t', item.removed && 'text-muted-foreground']}>
									<td class="max-w-0 truncate px-3.5" style="width: 30%" title={item.description}>
										<span class={['font-medium', item.removed && 'line-through']}>{item.name}</span>
										{#if item.removed}<Pill class="ml-1">removed</Pill>{/if}
									</td>
									<td class="text-muted-foreground max-w-0 truncate px-2" style="width: 16%" title={item.category}>{item.category ?? ''}</td>
									<td class="px-2 whitespace-nowrap">
										<span class="inline-flex gap-1">
											{#each item.topics.slice(0, 3) as topic (topic.key)}
												<Pill tone="outline" href={topicPageHref(topic.key, topic.kind)}>{topic.label}</Pill>
											{/each}
										</span>
									</td>
									{#each platforms as platform (platform)}
										{@const offer = offerOf(item, platform)}
										{@const was = offer ? before(offer.prices) : undefined}
										<td class="px-2 text-right whitespace-nowrap tabular-nums">
											{#if offer}
												<Tooltip
													text={[
														offer.removedAt ? `Off this menu since ${onDay(offer.removedAt)}` : undefined,
														was ? `${money(was.price, currencyOf(platform))} in ${monthLabel(was.month)}` : undefined,
														offer.likedShare !== undefined
															? `${Math.round(offer.likedShare * 100)}% of ${offer.ratingsCount ?? 0} raters liked it`
															: undefined,
														`First seen ${onDay(offer.firstSeenAt)}`
													]
														.filter(Boolean)
														.join(' · ')}>
													<span class={[offer.removedAt && 'text-muted-foreground line-through']}
														>{money(offer.price, currencyOf(platform))}{#if was && !offer.removedAt}<span
																class={was.price < offer.price ? 'text-destructive' : 'text-success'}
																>{was.price < offer.price ? ' ↑' : ' ↓'}</span
															>{/if}</span>
												</Tooltip>
											{:else}
												<span class="text-faint">—</span>
											{/if}
										</td>
									{/each}
									<td class="px-3.5 text-right whitespace-nowrap tabular-nums">
										{#if item.sources}
											<Tooltip text={namedHint(item)}>
												<a
													href={exploreHref({ cityId, brandId: brand.id, node: `term:${item.wordings[0].key}` })}
													class="font-semibold">{item.sources}</a>
												{#if item.praise}<span class="text-success"> +{item.praise}</span>{/if}
												{#if item.complaints}<span class="text-destructive"> −{item.complaints}</span>{/if}
											</Tooltip>
										{:else}
											<span class="text-faint">—</span>
										{/if}
									</td>
								</tr>
							{:else}
								<tr class="border-line/60 border-t">
									<td colspan={4 + platforms.length} class="text-muted-foreground px-3.5 py-3">No item matches.</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</DetailCard>
			{/if}
		{/if}
	{/if}
</div>
