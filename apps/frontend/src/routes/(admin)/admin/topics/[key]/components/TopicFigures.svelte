<script lang="ts">
	import type { AdminSearchRelatedQueryOutputDto, AdminTopicInsightOutputDto } from 'client';

	import TopicDishSearches from './TopicDishSearches.svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import TopicTable from '#components/admin/topics/TopicTable.svelte';
	import MonthChart from '#components/charts/MonthChart.svelte';
	import { monthLabel } from '#lib/culinary.js';
	import { change, points, tone } from '#lib/topic-format.js';
	import { isSearchedKind } from '#lib/topic-kinds.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// A kind of food in a city and month: its venues (supply), how much posts talk about it (buzz)
	// and how Google searches for it move over twelve months (demand), what it costs on the month's
	// delivery menus, what people search alongside it, who Google Maps lists first for it in each
	// district, the topics under it with their own figures, and its venues with why
	interface Props {
		data: AdminTopicInsightOutputDto;
		cityId: string;
		month: string;
		labelOf: (key: string) => string;
	}

	let { data, cityId, month, labelOf }: Props = $props();

	// The month both charts and the readouts show; the newest until one is picked
	let selected = $derived(data.months.length - 1);

	const VENUES_SHOWN = 25;
	let allVenues = $state(false);
	const SOURCE: Record<string, string> = {
		category: 'Google category',
		mentions: 'posts',
		menu: 'menu',
		reviews: 'review tags',
		manual: 'admin'
	};
	const euro = (v: number) => `€${v.toFixed(2)}`;
	const rising = (q: AdminSearchRelatedQueryOutputDto) => (q.breakout ? 'Breakout' : `+${q.value.toLocaleString('en')} %`);
</script>

{#snippet queries(title: string, list: AdminSearchRelatedQueryOutputDto[], isRising: boolean)}
	<div class="min-w-0">
		<p class="eyebrow text-muted-foreground m-0 mb-1">{title}</p>
		{#if list.length}
			<ol class="m-0 list-none p-0 text-sm">
				{#each list.slice(0, 12) as q (q.query)}
					<li class="flex justify-between gap-3 border-t py-1">
						<span class="truncate" title={q.query}>{q.query}</span>
						<span class="shrink-0 tabular-nums {isRising ? 'text-primary-darker' : 'text-muted-foreground'}">
							{isRising ? rising(q) : q.value}
						</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="text-muted-foreground m-0 text-xs">None in this window</p>
		{/if}
	</div>
{/snippet}

<div class="flex min-w-0 flex-col gap-5">
	<!-- The month in four numbers: supply, buzz, demand, price -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<div class="bg-paper border-line rounded-md border p-4">
			<p class="eyebrow text-muted-foreground m-0">Venues</p>
			<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">{data.row.venues}</p>
			<p class="text-muted-foreground m-0 text-xs">{data.row.primaryVenues} have it as their main food</p>
		</div>
		<div class="bg-paper border-line rounded-md border p-4">
			<p class="eyebrow text-muted-foreground m-0">Posts · {monthLabel(month)}</p>
			<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">{data.row.posts}</p>
			<p class="m-0 text-xs">
				<span class="text-muted-foreground">{data.row.share === null ? 'no share' : `${data.row.share} % of posts`}</span>
				<span class={tone(data.row.shareChange, 1)}> · {points(data.row.shareChange)}</span>
			</p>
		</div>
		<div class="bg-paper border-line rounded-md border p-4">
			<p class="eyebrow text-muted-foreground m-0">Google searches</p>
			<p class="m-0 mt-1 text-2xl font-semibold tabular-nums {tone(data.row.searchChange, 0.05)}">
				{change(data.row.searchChange)}
			</p>
			<p class="text-muted-foreground m-0 text-xs">against the month before</p>
		</div>
		<div class="bg-paper border-line rounded-md border p-4">
			<p class="eyebrow text-muted-foreground m-0">On menus · {monthLabel(month)}</p>
			{#if data.menu.venues && data.menu.median !== undefined}
				<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">{data.menu.venues}</p>
				<p class="text-muted-foreground m-0 text-xs">
					of {data.menu.menus} menus · median {euro(data.menu.median)}
					{#if data.menu.venues > 1}({euro(data.menu.p25 ?? data.menu.median)}–{euro(data.menu.p75 ?? data.menu.median)}){/if}
				</p>
			{:else}
				<p class="text-ink m-0 mt-1 text-2xl font-semibold tabular-nums">—</p>
				<p class="text-muted-foreground m-0 text-xs">
					{data.menu.menus ? `none of ${data.menu.menus} menus has it` : 'no menu stored for this month'}
				</p>
			{/if}
			<p class="text-muted-foreground m-0 mt-1 text-xs">
				Delivery menus are read for report venues and their competitors only, so these lean to them.
			</p>
		</div>
	</div>

	{#if data.menu.districts?.length}
		<AdminPanel title="Menu prices by district" note="Districts with 5+ venues selling it">
			<ul class="m-0 list-none p-0 text-sm">
				{#each data.menu.districts as d (d.district)}
					<li class="flex justify-between gap-3 border-t py-1">
						<span>{d.district}</span>
						<span class="text-muted-foreground tabular-nums">{d.venues} venues · median {euro(d.median)}</span>
					</li>
				{/each}
			</ul>
		</AdminPanel>
	{/if}

	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
		<MonthChart
			title="Google searches"
			note="Its own best month in twelve is 100: read the shape, not the level against another topic."
			months={data.months}
			values={data.row.searches}
			format={(v) => String(Math.round(v))}
			ceiling={100}
			venueName={data.row.label}
			{selected}
			onSelect={(i) => (selected = i)} />
		<MonthChart
			title="Posts about it"
			note="Posts by others about venues serving it, or about it."
			months={data.months}
			values={data.postsByMonth}
			kind="column"
			format={(v) => String(v)}
			unit="posts"
			venueName={data.row.label}
			{selected}
			onSelect={(i) => (selected = i)} />
	</div>

	<AdminPanel title="What people search with it" note="Google, twelve months">
		{#if data.related}
			<div class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
				{@render queries('Rising', data.related.rising, true)}
				{@render queries('Top', data.related.top, false)}
			</div>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">No related searches stored for this month's pull.</p>
		{/if}
	</AdminPanel>

	{#if isSearchedKind(data.row.kind)}
		<TopicDishSearches {cityId} topicKey={data.row.key} label={data.row.label} />
	{/if}

	{#if data.children.length}
		<AdminPanel title="Under it, in figures" note={`${data.children.length}`}>
			<TopicTable rows={data.children} months={data.months} {labelOf} />
		</AdminPanel>
	{/if}

	<AdminPanel title="Venues" note={`${data.venues.length}`}>
		{#if !data.venues.length}
			<EmptyState title="No venue is tagged with it" hint="Tag one from a venue's Overview tab." ground="none" size="sm" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-muted-foreground text-left text-xs">
						<tr>
							<th class="py-1.5 pr-3 font-normal">Venue</th>
							<th class="py-1.5 pr-3 font-normal">District</th>
							<th class="py-1.5 pr-3 font-normal">Why</th>
							<th class="py-1.5 pr-3 text-right font-normal">Posts · {monthLabel(month)}</th>
							<th class="py-1.5 text-right font-normal">Google</th>
						</tr>
					</thead>
					<tbody>
						{#each allVenues ? data.venues : data.venues.slice(0, VENUES_SHOWN) as v (v.id)}
							<tr class="border-t">
								<td class="py-1.5 pr-3">
									<a class="font-medium" href={`/admin/venues/${v.id}`}>{v.name}</a>
									{#if v.primary}<span class="text-primary-darker ml-1 text-xs">main food</span>{/if}
								</td>
								<td class="text-muted-foreground py-1.5 pr-3">{v.district ?? '—'}</td>
								<td class="text-muted-foreground py-1.5 pr-3 text-xs">
									{v.viaKey === data.row.key ? '' : `${v.viaLabel} · `}{SOURCE[v.source]}
								</td>
								<td class="py-1.5 pr-3 text-right tabular-nums">{v.posts || '—'}</td>
								<td class="py-1.5 text-right text-xs tabular-nums">
									{v.rating ? `${v.rating.toFixed(1)} ★ · ${v.reviewsCount ?? 0}` : '—'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if data.venues.length > VENUES_SHOWN}
				<Button size="sm" variant="ghost" class="mt-2" onclick={() => (allVenues = !allVenues)}>
					{allVenues ? 'Show fewer' : `Show all ${data.venues.length}`}
				</Button>
			{/if}
		{/if}
	</AdminPanel>
</div>
