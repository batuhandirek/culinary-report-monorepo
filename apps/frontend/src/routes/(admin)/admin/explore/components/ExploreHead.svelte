<script lang="ts">
	import type { AdminExploreHeadOutputDto } from 'client';

	import MonthChart from '#components/charts/MonthChart.svelte';
	import { monthLabel } from '#lib/culinary.js';
	import { EXPLORE_SIDES, type ExploreSide, SIDE_LABELS } from '#lib/explore.js';
	import { amountLabel } from '#lib/statements.js';
	import { topicHref } from '#lib/topic-format.js';

	// X's figures in the view: who raised it (reviews and posts, a source once), its share of the
	// scope's sources (with a side picked, on the theme pages' bases), the brands, Google's tags
	// (all-time, by place), the numbers stated, the sides, and the months. A side or a month picks.
	interface Props {
		head: AdminExploreHeadOutputDto;
		side?: ExploreSide;
		onSide: (side: ExploreSide | undefined) => void;
		onRef: (ref: string) => void;
		onMonth: (month: string) => void;
	}

	let { head, side, onSide, onRef, onMonth }: Props = $props();

	const n = (value: number) => value.toLocaleString('en-GB');
	const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;
	const pct = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)} %`);
	const last = $derived(head.months[head.months.length - 1]);
	const priorName = $derived(head.months.length > 1 ? monthLabel(head.months[head.months.length - 2].month).split(' ')[0] : 'the month before');
	const change = (pt: number | null) => (pt === null ? null : `${pt > 0 ? '+' : pt < 0 ? '−' : '±'}${Math.abs(pt).toFixed(1)} pt in ${monthLabel(last.month).split(' ')[0]} on ${priorName}`);
	// Rising complaints read bad, rising praise good, anything else neither
	const tone = (pt: number | null) =>
		!pt || (side !== 'complaints' && side !== 'praise') ? 'text-muted-foreground' : (pt > 0) === (side === 'complaints') ? 'text-destructive' : 'text-success';
	const range = $derived(head.from === head.to ? monthLabel(head.from) : `${monthLabel(head.from)} – ${monthLabel(head.to)}`);
	const baseWord = $derived(
		side === 'praise' || side === 'complaints'
			? 'with a praise or a complaint'
			: side === 'changes'
				? 'with a praise, a complaint or a noticed change'
				: 'with a claim'
	);
	const SIDE_TONES: Partial<Record<ExploreSide, string>> = { praise: 'text-success', complaints: 'text-destructive' };
	const selected = $derived(head.months.length - 1);
</script>

{#snippet figure(eyebrow: string, value: string, lines: { text: string; tone?: string }[])}
	<div class="bg-paper border-line rounded-md border p-4">
		<p class="eyebrow text-muted-foreground m-0">{eyebrow}</p>
		<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">{value}</p>
		{#each lines as line (line.text)}
			<p class={['m-0 text-xs', line.tone ?? 'text-muted-foreground']}>{line.text}</p>
		{/each}
	</div>
{/snippet}

<div class="flex flex-col gap-4">
	<div>
		{#if head.node}
			<p class="text-muted-foreground m-0 flex flex-wrap items-center gap-x-1 text-xs">
				{#if head.node.kind === 'term'}
					<span>Wording</span>
				{:else}
					<span class="capitalize">{head.node.kind}</span>
					{#each head.node.path as p (p.ref)}
						<span>·</span><button type="button" class="hover:text-ink underline-offset-2 hover:underline" onclick={() => onRef(p.ref)}>{p.label}</button>
					{/each}
				{/if}
			</p>
			<h2 class="text-ink m-0 mt-0.5 text-xl font-semibold">
				{head.node.kind === 'term' ? `“${head.node.label}”` : head.node.label}
				{#if head.node.kind !== 'term'}
					<a class="text-beet ml-1 text-xs font-normal" href={topicHref(head.node.ref)}>its page</a>
				{/if}
			</h2>
			{#if head.node.hint}<p class="text-muted-foreground m-0 mt-0.5 max-w-3xl text-sm">What it covers: {head.node.hint}.</p>{/if}
			{#if head.node.children.length || head.node.topics.length}
				<div class="mt-2 flex flex-wrap items-center gap-1.5">
					<span class="text-muted-foreground text-xs">{head.node.kind === 'term' ? 'Linked to' : 'Under it'}</span>
					{#each head.node.kind === 'term' ? head.node.topics : head.node.children as child (child.ref)}
						<button type="button" class="chip text-xs" onclick={() => onRef(child.ref)}>{child.label}</button>
					{/each}
				</div>
			{/if}
		{:else}
			<h2 class="text-ink m-0 text-xl font-semibold">Everything said</h2>
			<p class="text-muted-foreground m-0 mt-0.5 text-sm">Pick a topic or a wording on the left to see who talked about it.</p>
		{/if}
	</div>

	<div class="flex flex-wrap gap-1.5" role="group" aria-label="Side">
		<button type="button" class="chip text-xs" aria-pressed={!side} onclick={() => onSide(undefined)}>All sides</button>
		{#each EXPLORE_SIDES as s (s)}
			{@const count = head.sides.find((x) => x.side === s)?.sources ?? 0}
			<button type="button" class="chip text-xs" aria-pressed={side === s} disabled={!count && side !== s} onclick={() => onSide(side === s ? undefined : s)}>
				<span class={side === s ? '' : SIDE_TONES[s]}>{SIDE_LABELS[s]}</span> · {n(count)}
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
		{@render figure(`Reviews and posts · ${range}`, head.sources ? n(head.sources) : '—', [
			{ text: [plural(head.reviews, 'review'), plural(head.posts, 'post'), ...(head.others ? [plural(head.others, 'other source')] : [])].join(' · ') },
			{ text: `${plural(head.claims, 'claim')}, ${plural(head.brands, 'brand')}` }
		])}
		{@render figure('Share', pct(head.share), [
			{ text: `of the scope's ${n(head.base.sources)} reviews and posts ${baseWord}` },
			...(head.reviewShare !== null || head.postShare !== null
				? [{ text: `reviews ${pct(head.reviewShare)} · posts ${pct(head.postShare)}` }]
				: []),
			...(change(head.change.share) ? [{ text: change(head.change.share)!, tone: tone(head.change.share) }] : [])
		])}
		{@render figure('Google tags', head.tagVenues ? plural(head.tagVenues, 'place') : '—', [
			{ text: head.tagVenues ? `whose “people often mention” names it, ×${n(head.tagMentions)} in all` : 'No Google tag names it' },
			{ text: 'All-time, whatever the months' }
		])}
		{#if head.amounts.length}
			{@const a = head.amounts[0]}
			{@render figure(`Stated · ${a.unit === 'minutes' ? 'minutes' : 'euro'}`, `median ${amountLabel(a.median, a.unit)}`, [
				{ text: `${plural(a.sources, 'review or post', 'reviews and posts')} gave a number` },
				...(a.sources > 1 ? [{ text: `from ${amountLabel(a.min, a.unit)} to ${amountLabel(a.max, a.unit)}` }] : []),
				...head.amounts.slice(1).map((b) => ({ text: `also ${plural(b.sources, 'source')} in ${b.unit === 'minutes' ? 'minutes' : 'euro'}` }))
			])}
		{:else}
			{@render figure('Stated', '—', [{ text: 'No claim states a wait or a price' }])}
		{/if}
	</div>

	{#if head.months.length > 1}
		<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
			<MonthChart
				title="Reviews and posts a month"
				note="Each raising it once, however many claims."
				months={head.months.map((m) => m.month)}
				values={head.months.map((m) => m.sources)}
				kind="column"
				format={(v) => n(v)}
				venueName={head.node?.label ?? 'Everything'}
				{selected}
				onSelect={(i) => onMonth(head.months[i].month)} />
			<MonthChart
				title="Share a month"
				note={`Of the month's reviews and posts ${baseWord} in the scope.`}
				months={head.months.map((m) => m.month)}
				values={head.months.map((m) => m.share)}
				kind="column"
				format={(v) => `${v.toFixed(1)} %`}
				venueName={head.node?.label ?? 'Everything'}
				{selected}
				onSelect={(i) => onMonth(head.months[i].month)} />
		</div>
	{/if}
</div>
