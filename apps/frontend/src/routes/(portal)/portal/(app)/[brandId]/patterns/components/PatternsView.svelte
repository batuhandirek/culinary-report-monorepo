<script lang="ts">
	import { ArrowRight, Waypoints } from '@lucide/svelte';
	import type { PortalPatternsOutputDto } from 'client';

	import { shortMonth } from '#components/charts/month-chart.js';
	import MonthChart from '#components/charts/MonthChart.svelte';
	import { compact, monthLabel, TOPIC_LABELS } from '#lib/culinary.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	/**
	 * The Patterns tab: week by week across months (views, new reviews, busyness, booked out),
	 * then the relations each month's report computed (buzz to reviews, paid against organic,
	 * when complaints come in). Every chart holds one measure on its own axis, per the Trends
	 * tab's rules, with its table under it; nothing here is recomputed.
	 */
	interface Props {
		patterns: PortalPatternsOutputDto;
		brandId: string;
	}

	let { patterns, brandId }: Props = $props();

	// A chain's busyness and booked out are the picked branch's: their notes say which
	const place = $derived.by(() => {
		const branch =
			patterns.branches.length > 1 ? patterns.branches.find((b) => b.id === patterns.branchId) : undefined;
		return branch ? `${branch.street ?? branch.name} · ` : '';
	});
	const weeks = $derived(patterns.weeks);
	const weekKeys = $derived(weeks.map((w) => w.week));
	const rows = $derived(patterns.months);
	const months = $derived(rows.map((row) => row.month));

	const day = (date: string) =>
		new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	const partial = $derived(new Set(weeks.filter((w) => w.partial).map((w) => w.week)));
	const weekLong = (week: string) =>
		`week of ${day(week)}${partial.has(week) ? ' (part of it has no report)' : ''}`;
	const weekTable = (week: string) => `${day(week)}${partial.has(week) ? '*' : ''}`;
	// A month's name under its first Monday, so each month is named once
	const weekTick = (week: string) => (Number(week.slice(8, 10)) <= 7 ? shortMonth(week.slice(0, 7)) : null);

	// The last whole week with a report, else the last with any counts
	const lastWithViews = $derived.by(() => {
		const whole = weeks.findLastIndex((w) => w.views !== undefined && !w.partial);
		return whole >= 0 ? whole : weeks.findLastIndex((w) => w.views !== undefined);
	});
	let pickedWeek = $state<number | null>(null);
	const selectedWeek = $derived(pickedWeek ?? (lastWithViews >= 0 ? lastWithViews : weeks.length - 1));
	const selectWeek = (i: number) => (pickedWeek = i);

	const weekly = (get: (w: (typeof weeks)[number]) => number | undefined) =>
		weeks.map((w) => get(w) ?? null);
	const hasWeeks = $derived(weeks.some((w) => w.views !== undefined));
	const hasBusyness = $derived(weeks.some((w) => w.busyness !== undefined));
	const hasBooked = $derived(weeks.some((w) => w.booked !== undefined));

	const hasRelations = $derived(
		rows.some((row) => row.buzzToReviews || row.paidVsOrganic || row.complaintTimes)
	);
	const latestWithRelation = $derived(
		rows.findLastIndex((row) => row.buzzToReviews || row.paidVsOrganic || row.complaintTimes)
	);
	let pickedMonth = $state<number | null>(null);
	const selectedMonth = $derived(
		pickedMonth ?? (latestWithRelation >= 0 ? latestWithRelation : rows.length - 1)
	);
	const selectMonth = (i: number) => (pickedMonth = i);
	const selectedRow = $derived(rows[selectedMonth]);
	const sentences = $derived(
		[
			selectedRow.buzzToReviews?.sentence,
			selectedRow.paidVsOrganic?.sentence,
			selectedRow.complaintTimes?.sentence
		].filter((s): s is string => !!s)
	);

	const monthly = (get: (row: (typeof rows)[number]) => number | undefined) =>
		rows.map((row) => get(row) ?? null);

	const DAYS: Record<string, string> = {
		Mo: 'Monday',
		Tu: 'Tuesday',
		We: 'Wednesday',
		Th: 'Thursday',
		Fr: 'Friday',
		Sa: 'Saturday',
		Su: 'Sunday'
	};
	const complaintRows = $derived(
		rows.flatMap((row) =>
			(row.complaintTimes?.topics ?? []).map((t) => ({ month: row.month, written: row.complaintTimes!.written, ...t }))
		)
	);
	const topic = (key: string) => TOPIC_LABELS[key] ?? key;

	const count = (n: number) => compact(n);
	const index = (n: number) => String(Math.round(n));
	const pct = (n: number) => `${Math.round(n)}%`;
	const times = (n: number) => `${n.toFixed(1)}×`;
	const perPost = (n: number) => n.toFixed(1);
</script>

{#if !hasWeeks && !hasRelations}
	<EmptyState
		ground="paper"
		icon={Waypoints}
		title="No patterns yet"
		hint="Patterns fill in as your monthly reports come in: a month needs 10 or more Google reviews and 3 or more posts by others to show what followed what." />
{:else}
	<p class="text-muted-foreground m-0 text-sm">
		What came after what, across your last {rows.length} months. These are things that happened
		one after the other, not proof that one caused the other.
	</p>

	{#if hasWeeks}
		<h2 class="section-rule m-0">Week by week</h2>
		<p class="text-muted-foreground m-0 text-sm">
			Weeks run Monday to Sunday. A week marked * reaches into a month without a report, so its
			counts cover only part of it. Tap a week to see it on every chart.
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<MonthChart
				title="Views"
				note="Of posts by others about you, by the week they were posted"
				kind="column"
				months={weekKeys}
				values={weekly((w) => w.views)}
				format={count}
				unit="views"
				venueName="Views"
				keyHeader="Week"
				tickLabel={weekTick}
				longLabel={weekLong}
				tableLabel={weekTable}
				selected={selectedWeek}
				onSelect={selectWeek} />
			<MonthChart
				title="New Google reviews"
				note="By the week they were posted"
				kind="column"
				months={weekKeys}
				values={weekly((w) => w.reviews)}
				format={count}
				unit="reviews"
				venueName="Reviews"
				keyHeader="Week"
				tickLabel={weekTick}
				longLabel={weekLong}
				tableLabel={weekTable}
				selected={selectedWeek}
				onSelect={selectWeek} />
			{#if hasBusyness}
				<MonthChart
					title="Busyness"
					note={`${place}Google popular times: the week's ten busiest hours, 0–100 of your own peak`}
					months={weekKeys}
					values={weekly((w) => w.busyness)}
					format={index}
					unit="busyness index"
					ceiling={100}
					venueName="Busyness"
					keyHeader="Week"
					tickLabel={weekTick}
					longLabel={weekLong}
					tableLabel={weekTable}
					selected={selectedWeek}
					onSelect={selectWeek} />
			{/if}
			{#if hasBooked}
				<MonthChart
					title="Booked out"
					note={`${place}Share of Friday and Saturday evening slots already taken when we looked`}
					months={weekKeys}
					values={weekly((w) => w.booked)}
					format={pct}
					unit="booked out"
					ceiling={100}
					venueName="Booked out"
					keyHeader="Week"
					tickLabel={weekTick}
					longLabel={weekLong}
					tableLabel={weekTable}
					selected={selectedWeek}
					onSelect={selectWeek} />
			{/if}
		</div>
	{/if}

	<h2 class="section-rule m-0">What followed what</h2>
	{#if !hasRelations}
		<p class="text-muted-foreground m-0 text-sm">
			None of these months had enough to read yet: a month needs 10 or more Google reviews and 3 or
			more posts by others.
		</p>
	{:else}
		<div class="bg-paper border-line flex flex-col gap-3 rounded-md border px-4 py-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="text-ink m-0 text-base font-semibold">In {monthLabel(selectedRow.month)}</h3>
				{#if selectedRow.reportId}
					<Button
						variant="outline"
						suffixIcon={ArrowRight}
						href={`/portal/${brandId}/months/${selectedRow.reportId}`}>
						Open the {shortMonth(selectedRow.month)} report
					</Button>
				{/if}
			</div>
			{#if sentences.length}
				<ul class="m-0 flex list-none flex-col gap-2 p-0 text-[15px] leading-snug">
					{#each sentences as sentence (sentence)}<li>{sentence}</li>{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground m-0 text-sm">
					{selectedRow.reportId
						? 'Not enough posts or reviews this month to read a pattern.'
						: 'No report for this month.'}
				</p>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<MonthChart
				title="Reviews after the busiest week"
				note="New Google reviews the week after the month's most viewed week, against your usual pace (1.0× is usual)"
				{months}
				values={monthly((row) => row.buzzToReviews?.ratio)}
				format={times}
				unit="your usual pace"
				venueName="Reviews after the busiest week"
				selected={selectedMonth}
				onSelect={selectMonth} />
			<MonthChart
				title="Reviews after a post"
				note="New Google reviews in the seven days after a post, on average"
				{months}
				values={monthly((row) => row.paidVsOrganic?.paid.reviewsAfter)}
				comparisons={[
					{
						name: 'Organic posts',
						values: monthly((row) => row.paidVsOrganic?.organic.reviewsAfter)
					}
				]}
				format={perPost}
				unit="reviews after a paid or gifted post"
				venueName="Paid or gifted posts"
				othersLabel="Organic posts"
				selected={selectedMonth}
				onSelect={selectMonth} />
		</div>

		{#if complaintRows.length}
			<section class="bg-paper border-line flex flex-col gap-2 rounded-md border px-4 py-4">
				<header class="flex flex-col gap-0.5">
					<h3 class="text-ink m-0 text-base font-semibold">When complaints come in</h3>
					<p class="text-muted-foreground m-0 text-xs">
						Where a complaint gathers by the time its review was posted, read over each report's
						six months, against the share of all your reviews posted then
					</p>
				</header>
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-left text-sm tabular-nums">
						<thead>
							<tr class="text-muted-foreground text-xs">
								<th class="py-1 pr-3 font-medium">Report</th>
								<th class="py-1 pr-3 font-medium">Complaint</th>
								<th class="py-1 pr-3 font-medium">When</th>
								<th class="py-1 pr-3 text-right font-medium">Of its reviews</th>
								<th class="py-1 pr-3 text-right font-medium">All reviews then</th>
							</tr>
						</thead>
						<tbody>
							{#each complaintRows as row (`${row.month}-${row.topic}`)}
								<tr
									class={[
										'border-line border-t',
										row.month === selectedRow.month && 'bg-tint'
									]}>
									<td class="py-1.5 pr-3">{shortMonth(row.month, true)}</td>
									<td class="py-1.5 pr-3 first-letter:uppercase">{topic(row.topic)}</td>
									<td class="py-1.5 pr-3">{DAYS[row.day]} {row.daypart}</td>
									<td class="py-1.5 pr-3 text-right">{row.there} of {row.reviews}</td>
									<td class="py-1.5 pr-3 text-right">{Math.round(row.usualShare * 100)}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	{/if}
{/if}
