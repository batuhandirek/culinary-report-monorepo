<script lang="ts">
	import type { ReportBusyness, ReportBusynessWeek, ReportCompetitor, ReportDemand } from 'client';
	import type { Snippet } from 'svelte';

	import { compact, monthLabel } from '#lib/culinary.js';

	// "Did the buzz fill the place?": the month's weeks as columns, one row per measure (views of
	// posts by others, Google's busyness index, how booked out the sampled evenings were). Each
	// row has its own scale, so no two measures share an axis; every cell carries its value, so
	// the grid is its own table and prints as one.
	interface Props {
		busyness?: ReportBusyness;
		demand?: ReportDemand;
		/** The picked competitors: their booked-out shares go under the venue's */
		competitors?: ReportCompetitor[];
		month: string;
		/** The section's key in the report's numbering (one per branch) */
		key?: string;
		sectionHead: Snippet<[string, string, string]>;
	}

	let { busyness, demand, competitors = [], month, key = 'busyness', sectionHead }: Props = $props();

	const DAY_NAMES: Record<string, string> = {
		Mo: 'Monday',
		Tu: 'Tuesday',
		We: 'Wednesday',
		Th: 'Thursday',
		Fr: 'Friday',
		Sa: 'Saturday',
		Su: 'Sunday'
	};
	const PLATFORMS: Record<string, string> = {
		thefork: 'TheFork',
		opentable: 'OpenTable',
		google: 'Reserve with Google'
	};
	const platformName = (d: { platform: string; partner?: string }) =>
		`${PLATFORMS[d.platform] ?? d.platform}${d.partner ? ` (via ${d.partner})` : ''}`;

	const weekLabel = (week: string) =>
		new Date(`${week}T12:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});

	// Without busyness samples the open tables still get their own weeks
	const weeks = $derived.by((): ReportBusynessWeek[] => {
		if (busyness) return busyness.weeks;
		const byWeek = new Map<string, number[]>();
		for (const evening of demand?.evenings ?? []) {
			const d = new Date(`${evening.date}T12:00:00Z`);
			d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
			const week = d.toISOString().slice(0, 10);
			byWeek.set(week, [...(byWeek.get(week) ?? []), evening.booked]);
		}
		return [...byWeek]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([week, values]) => ({
				week,
				booked: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
			}));
	});

	type Row = {
		label: string;
		note: string;
		values: (number | undefined)[];
		max: number;
		format: (n: number) => string;
		cls: string;
	};
	const rows = $derived.by(() => {
		const out: Row[] = [];
		if (busyness) {
			const views = weeks.map((w) => w.views ?? 0);
			out.push({
				label: 'Views',
				note: 'of posts by others',
				values: views,
				max: Math.max(1, ...views),
				format: compact,
				cls: 'bg-ink'
			});
			out.push({
				label: 'Busyness',
				note: 'Google popular times, 0–100',
				values: weeks.map((w) => w.index),
				max: 100,
				format: (n) => String(Math.round(n)),
				cls: 'bg-primary-darker'
			});
		}
		if (demand) {
			out.push({
				label: 'Booked out',
				note: `Fri and Sat evenings on ${platformName(demand)}`,
				values: weeks.map((w) => w.booked),
				max: 100,
				format: (n) => `${Math.round(n)} %`,
				cls: 'bg-beet'
			});
		}
		return out;
	});

	// Booked out is the one demand figure comparable between venues: the same question is asked
	// of each. The competitors' median, then the district's and the city's
	const median = (values: number[]) => {
		const sorted = [...values].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	};
	const tableComparisons = $derived.by(() => {
		const booked = competitors.flatMap((c) => (c.demand ? [c.demand.booked] : []));
		return [
			booked.length && {
				label: booked.length === 1 ? 'Your competitor' : 'Your competitors',
				value: Math.round(median(booked) * 10) / 10,
				note: booked.length === 1 ? '' : `median of ${booked.length}`
			},
			demand?.district && {
				label: 'Your district',
				value: demand.district.median,
				note: `median of ${demand.district.venues} venues`
			},
			demand?.city && {
				label: 'The city',
				value: demand.city.median,
				note: `median of ${demand.city.venues} venues`
			}
		].filter((c) => !!c);
	});

	const peak = $derived(busyness?.peak);
	const previous = $derived(busyness?.previous);
</script>

{#if busyness || demand}
	<section class="break-inside-avoid">
		{@render sectionHead(key, 'Popular times and tables', 'Did the buzz fill the place?')}

		<div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#if busyness}
				<div class="bg-paper border-line rounded-md border px-4 py-3">
					<p class="eyebrow text-muted-foreground m-0">Busyness index</p>
					<p class="m-0 mt-1 text-2xl font-semibold tabular-nums">{busyness.index}</p>
					<p class="text-muted-foreground m-0 text-xs">
						{#if previous}{previous.index} in {monthLabel(previous.month)} ·
						{/if}{busyness.samples} samples
					</p>
				</div>
			{/if}
			{#if peak}
				<div class="bg-paper border-line rounded-md border px-4 py-3">
					<p class="eyebrow text-muted-foreground m-0">Busiest hour</p>
					<p class="m-0 mt-1 text-2xl font-semibold">
						{DAY_NAMES[peak.day] ?? peak.day}
						<span class="tabular-nums">{String(peak.hour).padStart(2, '0')}:00</span>
					</p>
					<p class="text-muted-foreground m-0 text-xs">
						{#if previous?.peak}
							{DAY_NAMES[previous.peak.day] ?? previous.peak.day}
							{String(previous.peak.hour).padStart(2, '0')}:00 in {monthLabel(previous.month)}
						{:else}
							On average over the month's samples
						{/if}
					</p>
				</div>
			{/if}
			{#if demand}
				<div class="bg-paper border-line rounded-md border px-4 py-3">
					<p class="eyebrow text-muted-foreground m-0">Weekend tables</p>
					<p class="m-0 mt-1 text-2xl font-semibold tabular-nums">{demand.booked} %</p>
					<p class="text-muted-foreground m-0 text-xs">
						booked out over {demand.evenings.length} evenings{demand.previousBooked !== undefined
							? ` · ${demand.previousBooked} % the month before`
							: ''}
					</p>
					{#if tableComparisons.length}
						<dl class="border-line m-0 mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t pt-2 text-xs">
							{#each tableComparisons as row (row.label)}
								<dt class="m-0 leading-tight">
									{row.label}{#if row.note}<span class="text-muted-foreground block text-[10px]"
											>{row.note}</span
										>{/if}
								</dt>
								<dd class="m-0 text-right font-semibold tabular-nums">{row.value} %</dd>
							{/each}
						</dl>
					{/if}
				</div>
			{/if}
		</div>

		<div class="overflow-x-auto">
			<table class="w-full min-w-[30rem] border-collapse text-xs">
				<caption class="sr-only">
					Views, busyness and booked-out evenings by week of {monthLabel(month)}
				</caption>
				<thead>
					<tr>
						<th class="w-32 text-left font-normal"></th>
						{#each weeks as week (week.week)}
							<th scope="col" class="text-muted-foreground px-1 pb-1 text-left font-normal">
								{weekLabel(week.week)}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.label)}
						<tr class="border-line border-t">
							<th scope="row" class="py-2 pr-2 text-left align-bottom font-normal">
								<span class="block text-sm font-medium">{row.label}</span>
								<span class="text-muted-foreground block text-[11px] leading-tight"
									>{row.note}</span>
							</th>
							{#each row.values as value, i (i)}
								<td class="px-1 py-2 align-bottom">
									<div class="bg-wash flex h-10 items-end rounded-[3px]">
										{#if value !== undefined && value > 0}
											<span
												class={['block w-full rounded-t-[3px]', row.cls]}
												style:height={`${Math.max(4, (value / row.max) * 100)}%`}></span>
										{/if}
									</div>
									<span class="mt-1 block font-medium tabular-nums">
										{value === undefined ? '—' : row.format(value)}
									</span>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-muted-foreground m-0 mt-2 text-xs">
			Weeks start on Monday. Busyness is the average of the ten busiest hours of the week in
			Google's popular times, which Google scales to your own peak, sampled on Thursday and
			Saturday evenings; "—" means Google showed no popular times that week.{#if demand}{' '}
				Booked out is the share of 18:00–22:00 start times with no table, asked a day or two
				ahead.{/if} The rows sit side by side; one does not prove the other.
		</p>
	</section>
{/if}
