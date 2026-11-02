<script lang="ts">
	import type { AdminExploreBreakdownOutputDto, AdminExploreBreakdownRowOutputDto } from 'client';

	import { monthLabel } from '#lib/culinary.js';
	import { DIMENSION_LABELS, EXPLORE_DIMENSIONS, type ExploreDimension } from '#lib/explore.js';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// X broken down by one dimension at a time, the most reviews and posts first (months in order):
	// each row's sources as a bar, praise and complaints within it, and its Google tag places. A
	// row narrows the page to it (a brand, a branch, a district, a source, a finer topic…).
	interface Props {
		by: ExploreDimension;
		data: AdminExploreBreakdownOutputDto | null;
		loading: boolean;
		onBy: (by: ExploreDimension) => void;
		onPick: (row: AdminExploreBreakdownRowOutputDto) => void;
	}

	let { by, data, loading, onBy, onPick }: Props = $props();

	const n = (value: number) => value.toLocaleString('en-GB');
	const SHOWN = 12;
	let all = $state(false);
	// Another dimension starts short again
	$effect(() => {
		void by;
		all = false;
	});
	const rows = $derived(all || by === 'month' ? (data?.rows ?? []) : (data?.rows ?? []).slice(0, SHOWN));
	const max = $derived(Math.max(1, ...(data?.rows ?? []).map((r) => r.sources)));
	const showTags = $derived((data?.rows ?? []).some((r) => r.tagVenues));
	const labelOf = (row: AdminExploreBreakdownRowOutputDto) => (by === 'month' && row.key ? monthLabel(row.key) : row.label);
	const NOTES: Partial<Record<ExploreDimension, string>> = {
		food: 'the kinds of food its claims name, what is under each counted in',
		aspect: 'what its claims are about, what is under each counted in',
		term: 'the wordings as the sources spelled them',
		venue: 'only posts naming a branch, and reviews, have one',
		place: "the brands' kind of place: the main food of most of their places in the city"
	};
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap gap-1.5" role="group" aria-label="Break down by">
		{#each EXPLORE_DIMENSIONS as d (d)}
			<button type="button" class="chip text-xs" aria-pressed={by === d} onclick={() => onBy(d)}>{DIMENSION_LABELS[d]}</button>
		{/each}
	</div>
	{#if data?.under || NOTES[by]}
		<p class="text-muted-foreground m-0 text-xs">{data?.under ? `Under ${data.under.label}: ` : ''}{NOTES[by] ?? ''}</p>
	{/if}
	{#if !data}
		<SkeletonRows count={6} />
	{:else if !data.rows.length}
		<p class="text-muted-foreground m-0 text-sm">Nothing to break down in this view.</p>
	{:else}
		<table class={['w-full border-collapse text-sm', loading && 'opacity-60']}>
			<thead>
				<tr class="text-muted-foreground text-left text-xs">
					<th class="w-[40%] py-1 font-normal">{DIMENSION_LABELS[by]}</th>
					<th class="py-1 font-normal">Reviews and posts</th>
					<th class="py-1 text-right font-normal" title="Of them, with praise / with a complaint">Praise · complaints</th>
					{#if showTags}<th class="py-1 text-right font-normal" title="Places whose Google tags name it (all-time)">Google tags</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.key ?? row.label)}
					<tr class="border-line border-t">
						<td class="max-w-0 py-1.5 pr-3">
							{#if row.key !== undefined}
								<button type="button" class="hover:text-beet block w-full truncate text-left" title={`Narrow to ${labelOf(row)}`} onclick={() => onPick(row)}>
									{labelOf(row)}
								</button>
							{:else}
								<span class="text-muted-foreground block truncate">{labelOf(row)}</span>
							{/if}
							{#if row.detail}<span class="text-muted-foreground block truncate text-xs">{row.detail}</span>{/if}
						</td>
						<td class="py-1.5 pr-3">
							<div class="flex items-center gap-2">
								<div class="bg-wash h-2 flex-1 overflow-hidden rounded-full">
									<div class="bg-primary-darker h-full rounded-full" style:width={`${(row.sources / max) * 100}%`}></div>
								</div>
								<span class="w-10 shrink-0 text-right tabular-nums">{row.sources ? n(row.sources) : '—'}</span>
							</div>
						</td>
						<td class="py-1.5 text-right tabular-nums">
							<span class="text-success">{n(row.praise)}</span> · <span class="text-destructive">{n(row.complaints)}</span>
						</td>
						{#if showTags}
							<td class="py-1.5 text-right tabular-nums" title={row.tagMentions ? `×${n(row.tagMentions)} in Google's counts` : undefined}>
								{row.tagVenues ? n(row.tagVenues) : '—'}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
		{#if rows.length < data.rows.length}
			<button type="button" class="text-beet self-start text-xs" onclick={() => (all = true)}>Show all {n(data.rows.length)}</button>
		{/if}
		{#if data.more && (all || by === 'month')}<p class="text-muted-foreground m-0 text-xs">{n(data.more)} more not listed.</p>{/if}
	{/if}
</div>
