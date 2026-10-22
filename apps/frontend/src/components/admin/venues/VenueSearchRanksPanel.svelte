<script lang="ts">
	import type { AdminVenueOutputDto, AdminVenueSearchRankOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Where the venue shows up on the Google Maps searches a guest would type, month by month
	// (the monthly TRACK_SEARCH_RANKS step), with who ranked first
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	const MONTHS = 6;

	let ranks = $state<AdminVenueSearchRankOutputDto[] | null>(null);
	const loader = createAutoLoader(api.admin.listVenueSearchRanks, [venue.id], {
		onSuccess: (list) => (ranks = list)
	});

	const months = $derived([...new Set((ranks ?? []).map((r) => r.month))].slice(0, MONTHS));
	// The latest month's searches first, then any older one, best rank first
	const queries = $derived.by(() => {
		const latest = (ranks ?? []).filter((r) => r.month === months[0]);
		const rest = (ranks ?? []).filter((r) => !latest.some((l) => l.query === r.query));
		return [...new Set([...latest, ...rest].map((r) => r.query))];
	});
	const cell = (query: string, month: string) =>
		ranks?.find((r) => r.query === query && r.month === month);
	const latestOf = (query: string) => (ranks ?? []).find((r) => r.query === query);
	const leader = (row: AdminVenueSearchRankOutputDto | undefined) =>
		row?.top.find((e) => e.placeId !== venue.placeId);
</script>

<AdminPanel title="Google Maps search ranks" note={queries.length || undefined}>
	{#if loader.error && !ranks}
		<ErrorState onRetry={() => loader.load(venue.id)} />
	{:else if !ranks}
		<SkeletonRows count={3} lines={1} trailing />
	{:else if !ranks.length}
		<EmptyState
			title="Not tracked yet"
			hint="The monthly run searches its kinds of food in its district once its brand gets a report."
			ground="none"
			size="sm" />
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-muted-foreground text-left text-xs">
						<th class="py-1 font-medium">Search</th>
						{#each months as month (month)}
							<th class="px-2 py-1 text-right font-medium whitespace-nowrap">{monthLabel(month)}</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-line divide-y">
					{#each queries as query (query)}
						{@const top = leader(latestOf(query))}
						<tr>
							<td class="py-2 pr-2">
								<span class="block font-medium">{query}</span>
								{#if top}
									<span class="text-muted-foreground block text-xs">
										<!-- First itself: the runner-up is behind, not ahead -->
										{latestOf(query)?.rank === 1 ? 'Next' : 'Ahead'}: {top.name}{top.rating ? ` · ${top.rating.toFixed(1)} ★` : ''}{top.reviewsCount
											? ` · ${top.reviewsCount.toLocaleString('en')} reviews`
											: ''}
									</span>
								{/if}
							</td>
							{#each months as month (month)}
								{@const row = cell(query, month)}
								<td class="px-2 py-2 text-right tabular-nums">
									{#if !row}
										<span class="text-muted-foreground">·</span>
									{:else if row.rank}
										<span class="font-medium">#{row.rank}</span>
									{:else}
										<span class="text-muted-foreground text-xs">not in {row.results}</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</AdminPanel>
