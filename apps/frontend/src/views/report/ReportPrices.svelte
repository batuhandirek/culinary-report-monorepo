<script lang="ts">
	import type { ReportPrices } from 'client';
	import type { Snippet } from 'svelte';

	import { monthLabel } from '#lib/culinary.js';

	// "Your prices next to your competitors'": the delivery listings (a second reputation), the
	// place's own kind of food against the same on the other menus, the median main course
	// against the other menus, the signature dishes against the same dish
	// elsewhere, and how often reviews criticise price here and at competitors.
	interface Props {
		prices: ReportPrices;
		/** The section's key in the report's numbering (one per branch) */
		key?: string;
		sectionHead: Snippet<[string, string, string]>;
	}

	let { prices, key = 'prices', sectionHead }: Props = $props();

	const PLATFORMS: Record<string, string> = { wolt: 'Wolt', lieferando: 'Lieferando' };
	const money = (n: number | undefined, currency = 'EUR') =>
		n === undefined
			? '—'
			: n.toLocaleString('en', {
					style: 'currency',
					currency,
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				});
	const menu = $derived(prices.menu);
	const pct = (share: number) => `${Math.round(share * 100)} %`;
	const diffText = (diff: number) =>
		Math.abs(diff) < 0.03
			? 'about the same'
			: `${Math.round(Math.abs(diff) * 100)} % ${diff > 0 ? 'above' : 'below'}`;
</script>

<section class="break-inside-avoid">
	{@render sectionHead(key, 'Delivery apps', 'Your prices next to theirs')}

	<div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#each prices.listings as listing (listing.platform)}
			<a
				href={listing.url}
				target="_blank"
				rel="noreferrer"
				class="bg-paper border-line hover:border-ink/40 rounded-md border px-4 py-3 no-underline">
				<p class="eyebrow text-beet m-0">{PLATFORMS[listing.platform] ?? listing.platform}</p>
				<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">
					{listing.rating !== undefined ? `${listing.rating.toFixed(1)}★` : '—'}
					{#if listing.reviewsCount !== undefined}
						<span class="text-muted-foreground text-sm font-normal"
							>{listing.reviewsCount.toLocaleString('en')} ratings</span>
					{/if}
				</p>
				<p class="text-muted-foreground m-0 text-xs">
					Delivery {money(listing.deliveryFee, listing.currency)}{listing.minOrder !== undefined
						? ` · minimum order ${money(listing.minOrder, listing.currency)}`
						: ''}
				</p>
			</a>
		{/each}
	</div>

	{#if prices.competitorListings.length}
		<p class="text-muted-foreground m-0 mb-5 text-xs">
			Competitors on delivery apps:
			{#each prices.competitorListings as c, i (c.name + c.platform)}
				{i ? ' · ' : ''}<span class="text-ink">{c.name}</span>
				{PLATFORMS[c.platform] ?? c.platform}
				{c.rating !== undefined ? `${c.rating.toFixed(1)}★` : '—'}
			{/each}
		</p>
	{/if}

	{#if menu}
		<div class="bg-tint border-ink/15 mb-4 rounded-md border px-5 py-4">
			<!-- Its own kind of food first, when another menu lists it too (absent in older reports) -->
			{#if menu.topic?.othersMedian !== undefined && menu.topic.diff !== undefined}
				<p class="m-0 mb-2 text-[15px] leading-snug">
					Your {menu.topic.label} on {PLATFORMS[menu.platform] ?? menu.platform}:
					<strong class="tabular-nums">{money(menu.topic.price, menu.currency)}</strong>,
					{menu.othersAre === 'competitors' ? 'your competitors’' : 'menus in your district'}
					<span class="tabular-nums">{money(menu.topic.othersMedian, menu.currency)}</span>
					({diffText(menu.topic.diff)}, {menu.topic.othersWithTopic}
					{menu.topic.othersWithTopic === 1 ? 'menu' : 'menus'}).
				</p>
			{/if}
			<p class="m-0 text-[15px] leading-snug">
				Your median main course on {PLATFORMS[menu.platform] ?? menu.platform} is
				<strong class="tabular-nums">{money(menu.median, menu.currency)}</strong>{#if menu.othersMedian !== undefined && menu.diff !== undefined},
					{diffText(menu.diff)}
					{menu.othersAre === 'competitors' ? 'your competitors' : 'menus in your district'}
					(<span class="tabular-nums">{money(menu.othersMedian, menu.currency)}</span>, {menu.othersWithMenu}
					{menu.othersWithMenu === 1 ? 'menu' : 'menus'}){/if}.
			</p>
		</div>
		{#if menu.dishes.length}
			<table class="w-full border-collapse text-sm">
				<caption class="sr-only">Your dishes' prices against the same dish elsewhere</caption>
				<thead>
					<tr class="text-muted-foreground text-xs">
						<th scope="col" class="pb-1 text-left font-normal">Dish</th>
						<th scope="col" class="pb-1 text-right font-normal">You</th>
						<th scope="col" class="pb-1 text-right font-normal">Elsewhere</th>
					</tr>
				</thead>
				<tbody>
					{#each menu.dishes as dish (dish.dish)}
						<tr class="border-line border-t">
							<th scope="row" class="py-1.5 text-left font-normal first-letter:uppercase"
								>{dish.dish}</th>
							<td class="py-1.5 text-right font-semibold tabular-nums"
								>{money(dish.price, menu.currency)}</td>
							<td class="text-muted-foreground py-1.5 text-right tabular-nums">
								{dish.othersMedian !== undefined
									? `${money(dish.othersMedian, menu.currency)} (${dish.othersWithDish})`
									: 'not on their menus'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/if}

	{#if prices.priceComplaints}
		<p class="m-0 mt-4 text-sm">
			Price is criticised in <strong class="tabular-nums"
				>{pct(prices.priceComplaints.share)}</strong>
			of your {prices.priceComplaints.written} written reviews{#if prices.priceComplaints.othersMedian !== undefined},
				<span class="tabular-nums">{pct(prices.priceComplaints.othersMedian)}</span> at your competitors'
				median{/if}.
		</p>
	{/if}

	<p class="text-muted-foreground m-0 mt-2 text-xs">
		{#if menu}Menu prices from {PLATFORMS[menu.platform] ?? menu.platform} in {monthLabel(menu.month)}.
			Main courses leave out drinks, desserts, sides and extras; elsewhere is the median of the
			other menus that list the dish, with how many do.
		{/if}Delivery prices can sit above the prices in the restaurant.
	</p>
</section>
