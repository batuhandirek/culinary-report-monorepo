<script lang="ts">
	import type { ReportSearchRank } from 'client';

	import { monthLabel } from '#lib/culinary.js';

	// Where the venue shows up when a guest searches Google Maps for its kind of food in its
	// district, who ranks above it, and the same search in earlier months
	interface Props {
		ranks: ReportSearchRank[];
	}

	let { ranks }: Props = $props();

	const TOP_SHOWN = 5;
	const ordinal = (n: number) => {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
	};
	const shortMonth = (month: string) => monthLabel(month).split(' ')[0].slice(0, 3);
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	{#each ranks as rank (rank.query)}
		{@const above = rank.top.slice(0, Math.min(TOP_SHOWN, (rank.rank ?? TOP_SHOWN + 1) - 1))}
		<div class="border-line bg-paper flex flex-col gap-3 rounded-md border px-4 py-3 break-inside-avoid">
			<div class="flex items-baseline justify-between gap-3">
				<span class="min-w-0 truncate text-sm font-semibold">“{rank.query}”</span>
				<span class="shrink-0 text-[22px] leading-none font-semibold tracking-tight tabular-nums">
					{rank.rank ? ordinal(rank.rank) : '—'}
				</span>
			</div>
			{#if !rank.rank}
				<p class="text-muted-foreground m-0 text-xs">Not in the first {rank.results} results.</p>
			{/if}
			{#if above.length}
				<ol class="m-0 flex list-none flex-col gap-0.5 p-0 text-xs">
					{#each above as place, i (i)}
						<li class="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-2">
							<span class="font-pixel text-muted-foreground text-[9px] leading-4">{i + 1}</span>
							<span class="truncate">{place.name}</span>
							<span class="text-muted-foreground tabular-nums">
								{place.rating ? `${place.rating.toFixed(1)} ★` : ''}{place.reviewsCount
									? ` · ${place.reviewsCount}`
									: ''}
							</span>
						</li>
					{/each}
				</ol>
			{/if}
			{#if rank.history.length}
				<p class="text-muted-foreground m-0 text-[11px] tabular-nums">
					{rank.history
						.map((h) => `${shortMonth(h.month)} ${h.rank ? ordinal(h.rank) : '—'}`)
						.join(' · ')}
				</p>
			{/if}
		</div>
	{/each}
</div>
<p class="text-muted-foreground m-0 mt-2 text-xs">
	Google Maps searches for your kind of food in your district, run once a month. Reviews, photos,
	replies and opening hours move the rank.
</p>
