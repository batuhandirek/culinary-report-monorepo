<script lang="ts">
	import { TOPIC_LABELS } from '#lib/culinary.js';

	// Complaints against praise per topic on one diverging axis: complaints run left in beet,
	// praise right in olive, each count printed at the bar's end.
	interface Props {
		praise: Record<string, number>;
		complaints: Record<string, number>;
		/** What a count counts: "reviews" or "posts" */
		unit: string;
	}

	let { praise, complaints, unit }: Props = $props();

	const topics = $derived(
		Object.keys(TOPIC_LABELS)
			// 'Other' says nothing on its own
			.filter((t) => t !== 'other' && (praise[t] || complaints[t]))
			.sort(
				(a, b) =>
					(praise[b] ?? 0) +
					(complaints[b] ?? 0) -
					(praise[a] ?? 0) -
					(complaints[a] ?? 0)
			)
	);
	const max = $derived(
		Math.max(1, ...topics.flatMap((t) => [praise[t] ?? 0, complaints[t] ?? 0]))
	);
	const width = (n: number) => `${n ? Math.max(3, (n / max) * 100) : 0}%`;
</script>

{#if topics.length}
	<div class="break-inside-avoid">
		<div
			class="text-muted-foreground mb-2 grid grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)] text-xs">
			<span></span>
			<span class="flex items-center justify-end gap-1.5 pr-2">
				<span class="bg-beet size-2.5 rounded-sm"></span>Criticised
			</span>
			<span class="flex items-center gap-1.5 pl-2">
				<span class="bg-primary-darker size-2.5 rounded-sm"></span>Praised
			</span>
		</div>
		<div class="grid grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-y-1.5">
			{#each topics as topic (topic)}
				{@const bad = complaints[topic] ?? 0}
				{@const good = praise[topic] ?? 0}
				<span class="text-ink text-sm">{TOPIC_LABELS[topic]}</span>
				<div
					class="border-ink/60 flex h-5 items-center justify-end gap-1.5 border-r pr-0.5">
					{#if bad}<span class="text-ink text-xs font-medium tabular-nums">{bad}</span
						>{/if}
					<span class="bg-beet h-3 rounded-l-[3px]" style:width={width(bad)}></span>
				</div>
				<div class="flex h-5 items-center gap-1.5 pl-0.5">
					<span class="bg-primary-darker h-3 rounded-r-[3px]" style:width={width(good)}
					></span>
					{#if good}<span class="text-ink text-xs font-medium tabular-nums">{good}</span
						>{/if}
				</div>
			{/each}
		</div>
		<p class="text-muted-foreground m-0 mt-2 text-xs">
			Number of {unit} that raised each topic.
		</p>
	</div>
{:else}
	<p class="text-muted-foreground m-0 text-sm">Nothing specific came up.</p>
{/if}
