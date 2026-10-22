<script lang="ts">
	import { ArrowRight, ChartLine } from '@lucide/svelte';
	import type { PortalSeriesOutputDto } from 'client';

	import SentimentChart from './SentimentChart.svelte';
	import TopicRows, { type TopicRow } from './TopicRows.svelte';

	import { calendarBands, percent, shortMonth } from '#components/charts/month-chart.js';
	import MonthChart, { type ChartComparison } from '#components/charts/MonthChart.svelte';
	import { calendarLine } from '#lib/city-calendar.js';
	import { compact, monthLabel, TOPIC_LABELS } from '#lib/culinary.js';
	import { cn } from '#ui/lib/utils.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	/**
	 * The Trends tab: the venue's months side by side, from its stored reports. A picked month
	 * (the chips, or a tap on any chart) is marked on every chart and opens its report.
	 */
	interface Props {
		series: PortalSeriesOutputDto;
		brandId: string;
		venueName: string;
	}

	let { series, brandId, venueName }: Props = $props();

	const rows = $derived(series.months);
	const months = $derived(rows.map((row) => row.month));
	const latestWithReport = $derived(rows.findLastIndex((row) => row.reportId));
	let picked = $state<number | null>(null);
	const selected = $derived(picked ?? (latestWithReport >= 0 ? latestWithReport : rows.length - 1));
	const select = (index: number) => (picked = index);
	const selectedRow = $derived(rows[selected]);
	// The city's holidays and events as bands on the count charts, the picked month's in a line
	const bands = $derived(calendarBands(series.calendar ?? []));
	const selectedCalendar = $derived(calendarLine(series.calendar?.[selected]));

	type Row = (typeof rows)[number];
	type Competitor = Row['competitors'][number];

	const pick = (get: (row: Row) => number | null | undefined) =>
		rows.map((row) => {
			const value = get(row);
			return value === undefined ? null : value;
		});

	/** Each competitor's values; `reviews` ones are unknown for an untracked competitor. */
	const against = (get: (c: Competitor) => number | undefined, reviews = false): ChartComparison[] =>
		series.competitors.map(({ venueId: id, name }) => ({
			name,
			values: rows.map((row) => {
				const c = row.competitors.find((c) => c.venueId === id);
				if (!c || (reviews && !c.reviewsTracked)) return null;
				return get(c) ?? null;
			})
		}));

	const hasData = $derived(rows.some((row) => row.social || row.reviews || row.rating !== null));
	// A chain's place charts (rating, foot traffic) are the picked branch's: their notes say which
	const place = $derived.by(() => {
		const branch = series.branches.length > 1 ? series.branches.find((b) => b.id === series.branchId) : undefined;
		return branch ? (branch.street ?? branch.name) : '';
	});

	/** The topics raised most over the window, as a share of the month's written reviews. */
	const topicRows = (kind: 'praise' | 'complaints'): TopicRow[] => {
		const totals = new Map<string, number>();
		for (const row of rows)
			for (const [topic, n] of Object.entries(row.topics?.[kind] ?? {}))
				totals.set(topic, (totals.get(topic) ?? 0) + n);
		return [...totals]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([topic]) => ({
				label: TOPIC_LABELS[topic] ?? topic,
				values: rows.map((row) =>
					row.topics && row.reviews?.written
						? (row.topics[kind][topic] ?? 0) / row.reviews.written
						: null
				)
			}));
	};

	/** The dishes talked about most over the window, by posts and reviews that named them. */
	const dishRows = $derived.by((): TopicRow[] => {
		const totals = new Map<string, { label: string; n: number }>();
		for (const row of rows)
			for (const dish of row.dishes ?? []) {
				const key = dish.name.toLowerCase();
				const entry = totals.get(key) ?? { label: dish.name, n: 0 };
				entry.n += dish.count;
				totals.set(key, entry);
			}
		return [...totals]
			.sort((a, b) => b[1].n - a[1].n)
			.slice(0, 6)
			.map(([key, { label }]) => ({
				label,
				values: rows.map((row) =>
					row.dishes ? (row.dishes.find((d) => d.name.toLowerCase() === key)?.count ?? 0) : null
				)
			}));
	});

	const count = (n: number) => compact(n);
	const stars = (n: number) => n.toFixed(1);

	// Scroll the month chips to the newest
	let chips = $state<HTMLElement | null>(null);
	$effect(() => {
		if (chips) chips.scrollLeft = chips.scrollWidth;
	});
</script>

{#if !hasData}
	<EmptyState
		ground="paper"
		icon={ChartLine}
		title="No months to compare yet"
		hint="Trends fill in as your monthly reports come in: one point a month." />
{:else}
	<div class="flex flex-col gap-3">
		<div
			bind:this={chips}
			class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
			role="group"
			aria-label="Month">
			{#each rows as row, i (row.month)}
				<button
					type="button"
					class={cn('chip h-11 shrink-0 px-3.5 text-sm', !row.reportId && 'text-muted-foreground')}
					aria-pressed={i === selected}
					onclick={() => select(i)}>
					{shortMonth(row.month, i === 0 || row.month.endsWith('-01'))}
				</button>
			{/each}
		</div>
		<div class="flex min-h-11 flex-wrap items-center justify-between gap-2">
			<p class="text-muted-foreground m-0 text-sm">
				{selectedRow.reportId
					? `${monthLabel(selectedRow.month)} is picked on every chart.`
					: `No report for ${monthLabel(selectedRow.month)}${selectedRow.social ? ': the figures come from the next report' : ''}.`}
			</p>
			{#if selectedRow.reportId}
				<Button
					variant="outline"
					suffixIcon={ArrowRight}
					href={`/portal/${brandId}/months/${selectedRow.reportId}`}>
					Open the {shortMonth(selectedRow.month)} report
				</Button>
			{/if}
		</div>
	</div>

	{#if selectedCalendar}
		<p class="text-muted-foreground m-0 text-sm">
			In {monthLabel(selectedRow.month)}: {selectedCalendar}. Shaded on the charts: holidays and city events.
		</p>
	{/if}

	{#if series.competitors.length}
		<p class="text-muted-foreground m-0 text-sm">
			The grey lines are your competitors: {series.competitors.map((c) => c.name).join(', ')}.
		</p>
	{/if}

	<h2 class="section-rule m-0">Social media</h2>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<MonthChart
			title="Views"
			note="Of posts by others about you"
			{months}
			values={pick((row) => row.social?.views)}
			comparisons={against((c) => c.views)}
			format={count}
			unit="views"
			{bands}
			{venueName}
			{selected}
			onSelect={select} />
		<MonthChart
			title="Posts by others"
			note="TikTok and Instagram; your own account's don't count"
			kind="column"
			{months}
			values={pick((row) => row.social?.posts)}
			comparisons={against((c) => c.posts)}
			format={count}
			unit="posts"
			{bands}
			{venueName}
			{selected}
			onSelect={select} />
		<MonthChart
			title="Creators"
			note="People who posted about you"
			{months}
			values={pick((row) => row.social?.creators)}
			comparisons={against((c) => c.creators)}
			format={count}
			unit="creators"
			{venueName}
			{selected}
			onSelect={select} />
		<SentimentChart
			{months}
			sentiment={rows.map((row) => row.social?.sentiment ?? null)}
			{selected}
			onSelect={select} />
	</div>

	<h2 class="section-rule m-0">Google reviews</h2>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<MonthChart
			title="New reviews"
			note="Written that month"
			kind="column"
			{months}
			values={pick((row) => row.reviews?.count)}
			comparisons={against((c) => c.reviews, true)}
			format={count}
			unit="reviews"
			{bands}
			{venueName}
			{selected}
			onSelect={select} />
		<MonthChart
			title="Stars that month"
			note="The average of that month's reviews"
			{months}
			values={pick((row) => row.reviews?.avgStars)}
			comparisons={against((c) => c.avgStars, true)}
			format={stars}
			unit="stars on average"
			zero={false}
			minSpan={0.5}
			ceiling={5}
			{venueName}
			{selected}
			onSelect={select} />
		<MonthChart
			title="Replies"
			note="Share of the month's reviews you answered"
			{months}
			values={pick((row) => row.reviews?.replyRate)}
			comparisons={against((c) => c.replyRate, true)}
			format={percent}
			unit="answered"
			ceiling={1}
			{venueName}
			{selected}
			onSelect={select} />
		<MonthChart
			title="Google rating"
			note={place ? `${place}: all time, at the end of each month` : 'All time, at the end of each month'}
			{months}
			values={pick((row) => row.rating)}
			comparisons={against((c) => c.rating)}
			format={stars}
			unit="stars"
			zero={false}
			minSpan={0.2}
			ceiling={5}
			{venueName}
			{selected}
			onSelect={select} />
	</div>

	{#if rows.some((row) => row.busyness || row.booked !== undefined)}
		<h2 class="section-rule m-0">Foot traffic{place ? ` · ${place}` : ''}</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#if rows.some((row) => row.busyness)}
				<MonthChart
					title="Busyness"
					note="Google popular times: the week's ten busiest hours, 0–100 of your own peak"
					{months}
					values={pick((row) => row.busyness?.index)}
					format={(n) => String(Math.round(n))}
					unit="busyness index"
					ceiling={100}
					{venueName}
					{selected}
					onSelect={select} />
			{/if}
			{#if rows.some((row) => row.booked !== undefined)}
				<!-- Booked out compares across venues (the same question asked of each), so the
				competitors and the district's median sit on the venue's axis -->
				<MonthChart
					title="Weekend tables"
					note="Share of Friday and Saturday 18:00–22:00 start times with no table for two"
					{months}
					values={pick((row) => row.booked)}
					comparisons={[
						...against((c) => c.booked).filter((c) => c.values.some((v) => v !== null)),
						...(rows.some((row) => row.districtBooked !== undefined)
							? [
									{
										name: 'District median',
										values: pick((row) => row.districtBooked),
										dashed: true
									}
								]
							: [])
					]}
					format={(n) => `${Math.round(n)} %`}
					unit="booked out"
					ceiling={100}
					{venueName}
					{selected}
					onSelect={select} />
			{/if}
		</div>
	{/if}

	<h2 class="section-rule m-0">What guests talk about</h2>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<TopicRows
			title="What guests praise"
			note="Share of the month's written reviews"
			{months}
			rows={topicRows('praise')}
			format={percent}
			{selected}
			empty="No written reviews in these months." />
		<TopicRows
			title="What guests criticise"
			note="Share of the month's written reviews"
			tone="bad"
			{months}
			rows={topicRows('complaints')}
			format={percent}
			{selected}
			empty="No complaints in these months." />
		<TopicRows
			title="Dishes"
			note="Posts and reviews that named them"
			{months}
			rows={dishRows}
			format={count}
			{selected}
			empty="No dish was named in these months." />
		<!-- Own-account followers get a chart here once they are tracked: task `own-account-stats`. -->
	</div>
{/if}
