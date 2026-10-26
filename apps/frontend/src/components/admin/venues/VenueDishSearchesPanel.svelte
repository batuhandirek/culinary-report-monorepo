<script lang="ts">
	import type { AdminVenueDishSearchesOutputDto, AdminVenueOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { topicHref } from '#lib/topic-format.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The dish searches the place is in the Google Maps top ten of ("pasta Mitte"), snapshot by
	// snapshot: TRACK_DISH_SEARCHES searches every dish in every district of its city every N days,
	// whoever the place is, so this fills for venues without a report too
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	let data = $state<AdminVenueDishSearchesOutputDto | null>(null);
	const loader = createAutoLoader(api.admin.getVenueDishSearches, [venue.id], {
		onSuccess: (res) => (data = res)
	});

	const rankIn = (ranks: { searchedOn: string; rank?: number }[], day: string) => ranks.find((r) => r.searchedOn === day);
	/** A snapshot day as "25 Oct": the stored date is the city's own, so no time zone moves it */
	const dayLabel = (day: string, year = false) =>
		new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			...(year && { year: 'numeric' }),
			timeZone: 'UTC'
		});
</script>

<AdminPanel title="Dish searches" note={data?.searches.length || undefined}>
	{#if loader.error && !data}
		<ErrorState onRetry={() => loader.load(venue.id)} />
	{:else if !data}
		<SkeletonRows count={3} lines={1} trailing />
	{:else if !data.snapshots.length}
		<EmptyState
			title="Not searched yet"
			hint="Every dish is searched in every district of the city on Google Maps as often as the city says; the searches this place is in the top ten of show here."
			ground="none"
			size="sm" />
	{:else if !data.searches.length}
		<EmptyState
			title="In no dish search's top ten"
			hint={`Every dish is searched in every district; this place wasn't in a top ten since ${dayLabel(data.snapshots[data.snapshots.length - 1], true)}.`}
			ground="none"
			size="sm" />
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-muted-foreground text-left text-xs">
						<th class="py-1 font-medium">Google Maps search</th>
						{#each data.snapshots as day (day)}
							<th class="px-2 py-1 text-right font-medium whitespace-nowrap">{dayLabel(day)}</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-line divide-y">
					{#each data.searches as search (`${search.topicKey}|${search.district}`)}
						<tr>
							<td class="py-2 pr-2">
								<a class="font-medium" href={topicHref(search.topicKey)}>{search.topicKey}</a>
								<span class="text-muted-foreground"> {search.district}</span>
							</td>
							{#each data.snapshots as day (day)}
								{@const cell = rankIn(search.ranks, day)}
								<td class="px-2 py-2 text-right tabular-nums">
									{#if !cell}
										<span class="text-muted-foreground" title="Not searched in that snapshot">·</span>
									{:else if cell.rank}
										<span class="font-medium">#{cell.rank}</span>
									{:else}
										<span class="text-muted-foreground text-xs" title="Searched, not in the top ten">not in 10</span>
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
