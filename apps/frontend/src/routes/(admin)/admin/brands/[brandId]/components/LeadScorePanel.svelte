<script lang="ts">
	import type { AdminBrandOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import {
		compact,
		LEAD_PROSPECT_SCORE,
		LEAD_SIGNAL_LABELS,
		leadScoreVariant,
		monthLabel
	} from '#lib/culinary.js';
	import { Badge } from '#ui/primitives-new/badge/index.js';

	// How the brand scores as a prospect, signal by signal (a chain's branches share one score)
	interface Props {
		brand: AdminBrandOutputDto;
	}

	let { brand }: Props = $props();

	const signals = $derived(brand.leadSignals);
	const score = $derived(brand.leadScore);
	const rows = $derived(
		signals
			? (Object.keys(LEAD_SIGNAL_LABELS) as (keyof typeof LEAD_SIGNAL_LABELS)[])
					// A score computed before a signal existed lacks it
					.filter((key) => signals[key])
					.map((key) => ({
						key,
						...LEAD_SIGNAL_LABELS[key],
						...signals[key]!
					}))
			: []
	);

	// `postsPercentile` → "posts percentile"
	const label = (key: string) => key.replace(/([A-Z])/g, ' $1').toLowerCase();

	const format = (key: string, value: number | boolean | string | null) => {
		if (value === null) return '—';
		if (typeof value === 'boolean') return value ? 'yes' : 'no';
		if (typeof value === 'string') return value;
		if (/Percentile|Share|Rate$/.test(key)) return `${Math.round(value * 100)} %`;
		if (key === 'views') return compact(value);
		return value.toLocaleString('en');
	};
</script>

<AdminPanel title="Lead score" note={signals ? monthLabel(signals.month) : undefined}>
	{#if signals && score != null}
		<div class="mb-4 flex items-baseline gap-3">
			<span class="text-3xl font-semibold tabular-nums">{Math.round(score)}</span>
			<span class="text-muted-foreground text-sm">/ 100</span>
			<Badge
				variant={leadScoreVariant(score)}
				class="rounded-full px-2 font-medium">
				{score >= LEAD_PROSPECT_SCORE ? 'Prospect' : 'Not a prospect yet'}
			</Badge>
		</div>

		<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
			{#each rows as row (row.key)}
				<li class="flex flex-col gap-1.5 py-2.5">
					<div class="flex items-center gap-3">
						<span class="w-36 shrink-0 font-medium" title={row.hint}>{row.name}</span>
						<span class="bg-wash h-2 flex-1 overflow-hidden rounded-full">
							{#if row.value != null}
								<span
									class="bg-primary-darker block h-full rounded-full"
									style={`width: ${row.value * 100}%`}></span>
							{/if}
						</span>
						<span class="w-20 shrink-0 text-right tabular-nums">
							{#if row.value == null}
								<span class="text-muted-foreground">unknown</span>
							{:else}
								{Math.round(row.value * 100)} %
							{/if}
						</span>
						<span
							class="text-muted-foreground w-24 shrink-0 text-right text-xs tabular-nums">
							weight {Math.round(row.weight * 100)} %
						</span>
					</div>
					<p class="text-muted-foreground m-0 text-xs">
						{#each Object.entries(row.inputs) as [key, value], i (key)}
							{i ? ' · ' : ''}{label(key)}
							<span class="text-ink tabular-nums">{format(key, value)}</span>
						{/each}
					</p>
				</li>
			{/each}
		</ul>

		{#if signals.denyListed}
			<p class="text-muted-foreground m-0 mt-3 text-xs">
				Halved: the name is on the city's chain deny-list.
			</p>
		{/if}
		{#if signals.newPlaceBonus}
			<p class="text-muted-foreground m-0 mt-3 text-xs">
				+{signals.newPlaceBonus} for a new place with few Google reviews.
			</p>
		{/if}
		{#if signals.missing.length}
			<p class="text-warning m-0 mt-3 text-xs">
				Missing to score it fully: {signals.missing.join(', ')}. Unknown signals count at
				half.
			</p>
		{/if}
	{:else}
		<p class="text-muted-foreground m-0 text-sm">
			Not scored yet. Scores are computed at the end of the monthly run, or by starting
			<a href="/admin/data?tab=runs" class="text-beet hover:underline">Score leads</a> on the Data page.
		</p>
	{/if}
</AdminPanel>
