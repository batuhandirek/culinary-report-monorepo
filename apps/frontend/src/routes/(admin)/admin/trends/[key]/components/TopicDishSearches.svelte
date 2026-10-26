<script lang="ts">
	import { ArrowDown, ArrowUp } from '@lucide/svelte';
	import type { AdminDishSearchDistrictOutputDto, AdminDishSearchesOutputDto, AdminDishSearchPlaceOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Who Google Maps puts first for the dish in each district ("pasta Mitte Berlin"): the
	// TRACK_DISH_SEARCHES top ten, kept as dated snapshots (the city's "every N days"), a district
	// and a snapshot at a time, each place against its rank in the snapshot before
	interface Props {
		cityId: string;
		topicKey: string;
		label: string;
	}

	let { cityId, topicKey, label }: Props = $props();

	let data = $state<AdminDishSearchesOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; topicKey: string; searchedOn?: string }) => api.admin.getDishSearches(query),
		{ onSuccess: (res) => (data = res) }
	);
	/** A snapshot day as "25 Oct 2026": the stored date is the city's own, so no time zone moves it */
	const dayLabel = (day: string) =>
		new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		});

	// The newest snapshot when the city or the dish changes; another one when picked
	const load = (searchedOn?: string) => cityId && loader.load({ cityId, topicKey, ...(searchedOn && { searchedOn }) });
	$effect(() => {
		data = null;
		load();
	});
	const snapshots = $derived((data?.snapshots ?? []).map((d) => ({ value: d, label: dayLabel(d) })));

	// The picked district stays picked across snapshots while it has a search
	let district = $state('');
	$effect(() => {
		if (data?.districts.length && !data.districts.some((d) => d.district === district))
			district = data.districts[0].district;
	});
	const shown = $derived(data?.districts.find((d) => d.district === district));
	const districts = $derived((data?.districts ?? []).map((d) => ({ value: d.district, label: d.district })));
</script>

{#snippet move(place: AdminDishSearchPlaceOutputDto, search: AdminDishSearchDistrictOutputDto)}
	{#if !search.previousSearched}
		<span class="text-muted-foreground">—</span>
	{:else if place.previousRank === undefined}
		<span class="text-primary-darker">new</span>
	{:else if place.previousRank > place.rank}
		<span class="text-primary-darker inline-flex items-center gap-0.5">
			<ArrowUp class="size-3" aria-label="up" />{place.previousRank - place.rank}
		</span>
	{:else if place.previousRank < place.rank}
		<span class="text-beet inline-flex items-center gap-0.5">
			<ArrowDown class="size-3" aria-label="down" />{place.rank - place.previousRank}
		</span>
	{:else}
		<span class="text-muted-foreground">same</span>
	{/if}
{/snippet}

<AdminPanel title="Google Maps top ten by district" note={data?.snapshots.length ? `${data.snapshots.length} snapshots` : undefined}>
	{#if loader.error && !data}
		<ErrorState onRetry={() => load(data?.searchedOn)} />
	{:else if !data}
		<SkeletonRows count={6} lines={1} trailing />
	{:else if !data.searchedOn || !shown}
		<EmptyState
			title="Not searched yet"
			hint={`Every dish is searched in every district on Google Maps ("${topicKey} <district> <city>") and the top ten kept, as often as the city's "Dish searches every N days" says.`}
			ground="none"
			size="sm" />
	{:else}
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<p class="text-muted-foreground m-0 text-sm">
				What a guest saw searching "{topicKey}
				{shown.district}" for {label} on {dayLabel(data.searchedOn)}.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<div class="w-40">
					<Select
						items={snapshots}
						value={data.searchedOn}
						onValueChange={(day) => day && day !== data?.searchedOn && load(day)}
						aria-label="Snapshot"
						size="sm" />
				</div>
				<div class="w-64">
					<Select items={districts} bind:value={district} aria-label="District" size="sm" />
				</div>
			</div>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="text-muted-foreground text-left text-xs">
					<tr>
						<th class="py-1.5 pr-3 font-normal">#</th>
						<th class="py-1.5 pr-3 font-normal">Place</th>
						<th class="py-1.5 pr-3 text-right font-normal">Google</th>
						<th class="py-1.5 text-right font-normal whitespace-nowrap">
							{data.previousOn ? `vs ${dayLabel(data.previousOn)}` : 'Move'}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each shown.places as place (place.placeId)}
						<tr class="border-t">
							<td class="py-1.5 pr-3 font-medium tabular-nums">{place.rank}</td>
							<td class="py-1.5 pr-3">
								{#if place.venueId}
									<a class="font-medium" href={`/admin/venues/${place.venueId}`}>{place.name}</a>
								{:else}
									<span class="font-medium">{place.name}</span>
									<span class="text-muted-foreground ml-1 text-xs">not one of our venues</span>
								{/if}
							</td>
							<td class="py-1.5 pr-3 text-right text-xs whitespace-nowrap tabular-nums">
								{place.rating ? `${place.rating.toFixed(1)} ★` : '—'}{place.reviewsCount
									? ` · ${place.reviewsCount.toLocaleString('en')}`
									: ''}
							</td>
							<td class="py-1.5 text-right text-xs tabular-nums">{@render move(place, shown)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if !data.previousOn}
			<p class="text-muted-foreground m-0 mt-2 text-xs">The first snapshot of this dish: moves show from the next one.</p>
		{:else if !shown.previousSearched}
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				{shown.district} wasn't searched on {dayLabel(data.previousOn)}, so no place's move is known here.
			</p>
		{/if}
	{/if}
</AdminPanel>
