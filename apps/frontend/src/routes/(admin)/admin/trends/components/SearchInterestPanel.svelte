<script lang="ts">
	import type {
		AdminSearchInterestOutputDto,
		AdminSearchInterestRowOutputDto,
		AdminSearchRelatedQueryOutputDto
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Google search interest per food topic over the twelve months up to `month`, next to the
	// topic's share of mentions: two small lines per row, each on its own axis (never one chart
	// with two scales), and the change against the month before. A row with Google's related
	// queries opens them below it
	interface Props {
		cityId: string;
		month: string;
	}

	let { cityId, month }: Props = $props();

	let table = $state<AdminSearchInterestOutputDto | null>(null);
	// Rows whose related queries are open, by kind and term
	let opened = $state<Record<string, boolean>>({});
	const rowKey = (row: AdminSearchInterestRowOutputDto) => `${row.kind} ${row.term}`;
	const RELATED_SHOWN = 10;
	const KIND_LABELS: Record<string, string> = {
		cuisine: 'Cuisine',
		dish: 'Dish',
		drink: 'Drink',
		diet: 'Diet',
		format: 'Place',
		meal: 'Meal'
	};
	const risingLabel = (q: AdminSearchRelatedQueryOutputDto) =>
		q.breakout ? 'Breakout' : `+${q.value.toLocaleString('en')} %`;
	const loader = createLoader(
		(query: { month: string; cityId: string }) => api.admin.getSearchInterest(query),
		{ onSuccess: (res) => (table = res) }
	);
	$effect(() => {
		table = null;
		if (cityId) loader.load({ month, cityId });
	});

	const W = 132;
	const H = 30;
	const PAD = 3;
	// Mention shares share one scale across rows, so their lines compare; searches are 0–100
	const shareMax = $derived(
		Math.max(
			1,
			...(table?.topics ?? []).flatMap((r) => (r.mentionShare ?? []).filter((v): v is number => v !== null))
		)
	);
	const path = (values: (number | null)[], max: number) => {
		let d = '';
		let pen = false;
		values.forEach((v, i) => {
			if (v === null) pen = false;
			else {
				const x = PAD + (i / Math.max(1, values.length - 1)) * (W - PAD * 2);
				const y = H - PAD - (v / max) * (H - PAD * 2);
				d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
				pen = true;
			}
		});
		return d;
	};
	const last = (values: (number | null)[] | undefined) => values?.at(-1) ?? null;
	const change = (c: number | null | undefined) =>
		c === null || c === undefined
			? '—'
			: c >= 1
				? `${(c + 1).toFixed(1).replace(/\.0$/, '')}×`
				: `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.round(Math.abs(c) * 100)}%`;
	const tone = (c: number | null | undefined) =>
		c === null || c === undefined || Math.abs(c) < 0.05
			? 'text-muted-foreground'
			: c > 0
				? 'text-primary-darker'
				: 'text-beet';
	const valuesTitle = (label: string, values: (number | null)[], unit: string) =>
		`${label}: ` +
		(table?.months ?? [])
			.map((m, i) => `${monthLabel(m)} ${values[i] === null ? '—' : `${values[i]}${unit}`}`)
			.join(', ');
</script>

{#snippet spark(values: (number | null)[], max: number, stroke: string, title: string)}
	<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} class="block overflow-visible" role="img" aria-label={title}>
		<title>{title}</title>
		<line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} class="stroke-line" stroke-width="1" />
		<path d={path(values, max)} fill="none" class={stroke} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/snippet}

{#snippet queries(title: string, list: AdminSearchRelatedQueryOutputDto[], rising: boolean)}
	<div class="min-w-0">
		<p class="eyebrow text-muted-foreground m-0 mb-1">{title}</p>
		{#if list.length}
			<ol class="m-0 list-none p-0">
				{#each list.slice(0, RELATED_SHOWN) as q (q.query)}
					<li class="flex justify-between gap-3 py-0.5">
						<span class="truncate" title={q.query}>{q.query}</span>
						<span class="shrink-0 tabular-nums {rising ? 'text-primary-darker' : 'text-muted-foreground'}">
							{rising ? risingLabel(q) : q.value}
						</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="text-muted-foreground m-0 text-xs">None in this window</p>
		{/if}
	</div>
{/snippet}

{#snippet rows(items: AdminSearchInterestRowOutputDto[], withShare: boolean)}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead class="text-muted-foreground text-left text-xs">
				<tr>
					<th class="py-1.5 pr-3 font-normal">{withShare ? 'Topic' : 'Venue'}</th>
					<th class="py-1.5 pr-3 font-normal">Google searches, 12 months</th>
					<th class="py-1.5 pr-3 text-right font-normal">Now</th>
					<th class="py-1.5 pr-3 text-right font-normal">vs last month</th>
					{#if withShare}
						<th class="py-1.5 pr-3 font-normal">Share of mentions, 12 months</th>
						<th class="py-1.5 pr-3 text-right font-normal">Now</th>
						<th class="py-1.5 text-right font-normal">vs last month</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each items as row (row.kind + row.term)}
					<tr class="border-t">
						<td class="py-1.5 pr-3 font-medium">
							{#if row.brandId}<a href={`/admin/brands/${row.brandId}`}>{row.label}</a>{:else}{row.label}{/if}
							{#if row.topicKind}
								<span class="text-muted-foreground ml-1 text-xs font-normal">{KIND_LABELS[row.topicKind]}</span>
							{/if}
							{#if row.related}
								<button
									type="button"
									class="text-muted-foreground hover:text-foreground ml-1.5 text-xs font-normal underline-offset-2 hover:underline"
									aria-expanded={!!opened[rowKey(row)]}
									onclick={() => (opened[rowKey(row)] = !opened[rowKey(row)])}>
									{opened[rowKey(row)] ? 'Hide related' : 'Related searches'}
								</button>
							{/if}
						</td>
						<td class="py-1.5 pr-3">
							{@render spark(row.interest, 100, 'stroke-primary-darker', valuesTitle('Searches', row.interest, ''))}
						</td>
						<td class="py-1.5 pr-3 text-right tabular-nums">{last(row.interest) ?? '—'}</td>
						<td class="py-1.5 pr-3 text-right tabular-nums {tone(row.searchChange)}">{change(row.searchChange)}</td>
						{#if withShare}
							<td class="py-1.5 pr-3">
								{@render spark(
									row.mentionShare ?? [],
									shareMax,
									'stroke-beet',
									valuesTitle('Share of mentions', row.mentionShare ?? [], ' %')
								)}
							</td>
							<td class="py-1.5 pr-3 text-right tabular-nums">
								{last(row.mentionShare) === null ? '—' : `${last(row.mentionShare)} %`}
							</td>
							<td class="py-1.5 text-right tabular-nums {tone(row.mentionChange)}">{change(row.mentionChange)}</td>
						{/if}
					</tr>
					{#if row.related && opened[rowKey(row)]}
						<tr>
							<td colspan={withShare ? 7 : 4} class="pt-1 pb-3">
								<div class="grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-2">
									{@render queries('Rising', row.related.rising, true)}
									{@render queries('Top', row.related.top, false)}
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<AdminPanel title="Searched and talked about" note={table ? `Google Trends, ${table.geo}` : undefined}>
	{#if loader.error}
		<ErrorState onRetry={() => loader.load({ month, cityId })} />
	{:else if !table}
		<SkeletonRows count={5} lines={1} trailing />
	{:else if !table.topics.length && !table.brands.length}
		<EmptyState
			title="No Google Trends pull yet"
			hint="The monthly run's Google Trends step (or a run of it on the Data page) stores the twelve months up to its month."
			ground="none"
			size="sm" />
	{:else}
		<p class="text-muted-foreground m-0 mb-3 text-sm">
			Each topic is searched alone (Google's topic, in Food &amp; Drink), so 100 is its own peak over the twelve
			months: read a line's shape, not its level against another row. A topic's share of mentions counts its
			children too (ramen counts for Japanese), so shares don't add up to 100. Rising in mentions but not in
			searches is early; rising in both is a trend.
			Related searches are Google's over the same twelve months: top ones against the most searched (100), rising
			ones by growth against the twelve months before.
		</p>
		{@render rows(table.topics, true)}
		{#if table.brands.length}
			<p class="eyebrow text-muted-foreground m-0 mt-5 mb-1">Subscribers' names</p>
			{@render rows(table.brands, false)}
		{/if}
	{/if}
</AdminPanel>
