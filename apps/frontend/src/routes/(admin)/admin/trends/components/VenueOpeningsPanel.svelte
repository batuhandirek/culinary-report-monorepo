<script lang="ts">
	import type { AdminVenueStatusChangesOutputDto, VenueStatusGroup } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Openings and closures the Google Maps scrapes saw in the quarter ending with `month`:
	// by district, by kind of food, and the venues themselves
	interface Props {
		cityId: string;
		month: string;
	}

	let { cityId, month }: Props = $props();

	const CATEGORY_ROWS = 8;
	const VENUE_ROWS = 15;
	const KIND_LABELS: Record<string, string> = {
		opened: 'opened',
		temporarily_closed: 'closed for now',
		permanently_closed: 'closed',
		reopened: 'reopened'
	};

	let summary = $state<AdminVenueStatusChangesOutputDto | null>(null);
	const loader = createLoader(
		(query: { month: string; cityId: string }) => api.admin.getVenueStatusChanges(query),
		{ onSuccess: (res) => (summary = res) }
	);
	$effect(() => {
		summary = null;
		if (cityId) loader.load({ month, cityId });
	});

	const closed = (g: Pick<VenueStatusGroup, 'temporarilyClosed' | 'permanentlyClosed'>) =>
		g.temporarilyClosed + g.permanentlyClosed;
	const range = $derived(summary ? `${monthLabel(summary.from)} – ${monthLabel(summary.to)}` : '');
	const total = $derived(
		summary ? summary.totals.opened + closed(summary.totals) + summary.totals.reopened : 0
	);
</script>

{#snippet groupTable(rows: VenueStatusGroup[], label: string)}
	<table class="w-full text-sm">
		<thead>
			<tr class="text-muted-foreground text-left text-xs">
				<th class="py-1 font-medium">{label}</th>
				<th class="py-1 text-right font-medium">Opened</th>
				<th class="py-1 text-right font-medium">Closed</th>
				<th class="py-1 text-right font-medium">Reopened</th>
			</tr>
		</thead>
		<tbody class="divide-line divide-y">
			{#each rows as row (row.key)}
				<tr>
					<td class="py-1.5 pr-2">{row.key}</td>
					<td class="py-1.5 text-right tabular-nums">{row.opened || '–'}</td>
					<td class="py-1.5 text-right tabular-nums">{closed(row) || '–'}</td>
					<td class="py-1.5 text-right tabular-nums">{row.reopened || '–'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/snippet}

<AdminPanel title="Openings and closures" note={range || 'this quarter'}>
	{#if loader.error && !summary}
		<ErrorState onRetry={() => loader.load({ month, cityId })} />
	{:else if !summary}
		<SkeletonRows count={5} lines={1} trailing />
	{:else if total === 0}
		<EmptyState
			title="No openings or closures seen"
			hint="They come from the quarterly city venue scrape (after the city's first one) and the monthly detail refresh."
			ground="none"
			size="sm" />
	{:else}
		<div class="flex flex-col gap-5">
			<p class="text-muted-foreground m-0 text-sm">
				{summary.totals.opened} opened, {closed(summary.totals)} closed ({summary.totals
					.permanentlyClosed} for good), {summary.totals.reopened} reopened. Dates are when a scrape
				first saw the change; an opening is a place a city scrape found for the first time with few
				reviews.
			</p>
			<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
				<div class="min-w-0">{@render groupTable(summary.byDistrict, 'District')}</div>
				<div class="min-w-0">
					{@render groupTable(summary.byCategory.slice(0, CATEGORY_ROWS), 'Kind of food')}
				</div>
			</div>
			<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
				{#each summary.changes.slice(0, VENUE_ROWS) as change (`${change.venueId}-${change.kind}-${change.at}`)}
					<li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
						<a href={`/admin/venues/${change.venueId}`} class="min-w-0 hover:underline">
							<span class="block truncate font-medium">{change.name}</span>
							<span class="text-muted-foreground block truncate text-xs">
								{[change.category, change.district, change.street].filter(Boolean).join(' · ')}
							</span>
						</a>
						<span class="text-right text-xs">
							<span class="block">{KIND_LABELS[change.kind] ?? change.kind}</span>
							<span class="text-muted-foreground block tabular-nums"
								>{new Date(change.at).toLocaleDateString('en-GB', {
									day: 'numeric',
									month: 'short'
								})}</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</AdminPanel>
