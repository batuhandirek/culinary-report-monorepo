<script lang="ts">
	import type { ReportAspect } from 'client';

	import { TOPIC_LABELS } from '#lib/culinary.js';

	// Complaints against praise per topic on one diverging axis: complaints run left in beet,
	// praise right in olive, each count printed at the bar's end. With theme counts (reports built
	// since themes), each topic's themes are listed under its bars, the same sides. Labels and which
	// root a theme counts under come from the report's own aspect vocabulary (`aspects`); a report
	// built before it was kept lists no themes, since nothing says which topic they sit under.
	interface Props {
		praise: Record<string, number>;
		complaints: Record<string, number>;
		praiseThemes?: Record<string, number>;
		complaintThemes?: Record<string, number>;
		/** The aspect vocabulary at the build (`ReportData.aspects`), roots first */
		aspects?: ReportAspect[];
		/** What a count counts: "reviews" or "posts" */
		unit: string;
	}

	let { praise, complaints, praiseThemes, complaintThemes, aspects, unit }: Props = $props();

	const byKey = $derived(new Map((aspects ?? []).map((a) => [a.key, a])));
	const label = (key: string) => byKey.get(key)?.label ?? TOPIC_LABELS[key] ?? key;

	// A topic's themes on one side, most raised first, the root itself left out (a point filed
	// there says nothing finer than the topic), three at most
	const THEMES_SHOWN = 3;
	const themesOf = (counts: Record<string, number> | undefined, topic: string) =>
		Object.entries(counts ?? {})
			.filter(([key, n]) => n && key !== topic && byKey.get(key)?.root === topic)
			.sort(([, a], [, b]) => b - a)
			.slice(0, THEMES_SHOWN);

	const roots = $derived(aspects?.length ? aspects.filter((a) => a.root === a.key).map((a) => a.key) : Object.keys(TOPIC_LABELS));
	const topics = $derived(
		roots
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
	const themed = $derived(!!aspects?.length && !!(praiseThemes || complaintThemes));
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
				<span class="text-ink text-sm">{label(topic)}</span>
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
				{@const badThemes = themesOf(complaintThemes, topic)}
				{@const goodThemes = themesOf(praiseThemes, topic)}
				{#if badThemes.length || goodThemes.length}
					<span></span>
					<span class="text-muted-foreground -mt-1 pr-2 text-right text-xs leading-snug">
						{badThemes.map(([key, n]) => `${label(key)} ${n}`).join(' · ')}
					</span>
					<span class="text-muted-foreground -mt-1 pl-2 text-xs leading-snug">
						{goodThemes.map(([key, n]) => `${label(key)} ${n}`).join(' · ')}
					</span>
				{/if}
			{/each}
		</div>
		<p class="text-muted-foreground m-0 mt-2 text-xs">
			Number of {unit} that raised each topic{themed ? ', and under it the points they raised most' : ''}.
		</p>
	</div>
{:else}
	<p class="text-muted-foreground m-0 text-sm">Nothing specific came up.</p>
{/if}
