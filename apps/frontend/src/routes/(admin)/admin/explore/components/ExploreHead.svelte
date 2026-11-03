<script lang="ts">
	import { Info } from '@lucide/svelte';
	import type { AdminExploreHeadOutputDto } from 'client';

	import { monthLabel } from '#lib/culinary.js';
	import type { ExploreSide } from '#lib/explore.js';
	import { amountLabel } from '#lib/statements.js';

	// X's figures in the view as one strip: who raised it (reviews and posts, a source once), its share of the scope's sources
	// (with a side picked, on the theme pages' bases), Google's tags (all-time, by place) and the
	// numbers stated. Each figure's fine print is its hint.
	interface Props {
		head: AdminExploreHeadOutputDto;
		side?: ExploreSide;
	}

	let { head, side }: Props = $props();

	const n = (value: number) => value.toLocaleString('en-GB');
	const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;
	const pct = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)} %`);
	const last = $derived(head.months[head.months.length - 1]);
	const priorName = $derived(head.months.length > 1 ? monthLabel(head.months[head.months.length - 2].month).split(' ')[0] : 'the month before');
	const signed = (pt: number) => `${pt > 0 ? '+' : pt < 0 ? '−' : '±'}${Math.abs(pt).toFixed(1)} pt`;
	const change = (pt: number) => `${signed(pt)} in ${monthLabel(last.month).split(' ')[0]} on ${priorName}`;
	// Rising complaints read bad, rising praise good, anything else neither
	const tone = (pt: number) =>
		!pt || (side !== 'complaints' && side !== 'praise') ? 'text-muted-foreground' : (pt > 0) === (side === 'complaints') ? 'text-destructive' : 'text-success';
	const range = $derived(head.from === head.to ? monthLabel(head.from) : `${monthLabel(head.from)} – ${monthLabel(head.to)}`);
	const baseWord = $derived(
		side === 'praise' || side === 'complaints'
			? 'with a praise or a complaint'
			: side === 'changes'
				? 'with a praise, a complaint or a noticed change'
				: 'with a claim'
	);
	const shareChange = $derived(head.change.share);
	const unitWord = (unit: string) => (unit === 'minutes' ? 'minutes' : 'euro');
</script>

{#snippet figure(label: string, value: string, sub: string | undefined, hint: string, extra?: { text: string; tone: string })}
	<div class="min-w-0 px-4 py-2.5" title={hint}>
		<p class="text-muted-foreground m-0 flex items-center gap-1 text-xs">{label}<Info class="text-faint size-3" aria-label={hint} /></p>
		<p class="text-ink m-0 text-xl leading-7 font-semibold tabular-nums">
			{value}{#if extra}<span class={['ml-1.5 text-xs font-medium', extra.tone]}>{extra.text}</span>{/if}
		</p>
		{#if sub}<p class="text-muted-foreground m-0 truncate text-xs">{sub}</p>{/if}
	</div>
{/snippet}

<div class="bg-paper border-line divide-line grid grid-cols-2 rounded-md border sm:grid-cols-4 sm:divide-x">
		{@render figure(
			'Reviews and posts',
			head.sources ? n(head.sources) : '—',
			[plural(head.reviews, 'review'), plural(head.posts, 'post'), ...(head.others ? [plural(head.others, 'other')] : [])].join(' · '),
			`${range}: each review or post raising it counted once. ${plural(head.claims, 'claim')}, ${plural(head.brands, 'brand')}.`
		)}
		{@render figure(
			'Share',
			pct(head.share),
			head.reviewShare !== null || head.postShare !== null ? `reviews ${pct(head.reviewShare)} · posts ${pct(head.postShare)}` : undefined,
			`Of the scope's ${n(head.base.sources)} reviews and posts ${baseWord}.${shareChange !== null ? ` ${change(shareChange)}.` : ''}`,
			shareChange !== null && head.months.length > 1 ? { text: signed(shareChange), tone: tone(shareChange) } : undefined
		)}
		{@render figure(
			'Google tags',
			head.tagVenues ? plural(head.tagVenues, 'place') : '—',
			head.tagVenues ? `×${n(head.tagMentions)} in Google's counts` : undefined,
			'Places whose Google “people often mention” names it. All-time, whatever the months.'
		)}
		{#if head.amounts.length}
			{@const a = head.amounts[0]}
			{@render figure(
				`Stated ${a.unit === 'minutes' ? 'wait' : 'price'}`,
				amountLabel(a.median, a.unit),
				a.sources > 1 ? `${amountLabel(a.min, a.unit)} – ${amountLabel(a.max, a.unit)} · ${plural(a.sources, 'source')}` : plural(a.sources, 'source'),
				`The median number stated, in ${unitWord(a.unit)}.${head.amounts
					.slice(1)
					.map((b) => ` Also ${plural(b.sources, 'source')} in ${unitWord(b.unit)}.`)
					.join('')}`
			)}
		{:else}
			{@render figure('Stated', '—', undefined, 'No claim here states a wait or a price.')}
		{/if}
	</div>
