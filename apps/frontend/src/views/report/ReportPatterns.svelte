<script lang="ts">
	import type { ReportCorrelations } from 'client';
	import type { Snippet } from 'svelte';

	import { compact, TOPIC_LABELS } from '#lib/culinary.js';

	// The relations the month's posts and reviews allow, each shown only above its floors:
	// views against new reviews by week, when in the week complaints come from, paid or gifted
	// posts against organic ones. Worded as "followed by", never as a cause.
	interface Props {
		correlations: ReportCorrelations;
		sectionHead: Snippet<[string, string, string]>;
	}

	let { correlations, sectionHead }: Props = $props();

	const buzz = $derived(correlations.buzzToReviews);
	const times = $derived(correlations.complaintTimes);
	const paid = $derived(correlations.paidVsOrganic);

	const weekLabel = (week: string) =>
		new Date(`${week}T12:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	const maxViews = $derived(Math.max(1, ...(buzz?.weeks ?? []).map((w) => w.views)));
	const maxReviews = $derived(
		Math.max(1, buzz?.baselinePerWeek ?? 0, ...(buzz?.weeks ?? []).map((w) => w.reviews))
	);

	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const PARTS = [
		{ key: 'morning', label: 'Morning', hours: [6, 7, 8, 9, 10] },
		{ key: 'midday', label: 'Midday', hours: [11, 12, 13, 14] },
		{ key: 'afternoon', label: 'Afternoon', hours: [15, 16, 17] },
		{ key: 'evening', label: 'Evening', hours: [18, 19, 20, 21] },
		{ key: 'night', label: 'Night', hours: [22, 23, 0, 1, 2, 3, 4, 5] }
	];
	// Reviews with a complaint per weekday × part of day, from the hour matrix
	const grid = $derived(
		(times?.matrix ?? []).map((hours) =>
			PARTS.map((part) => part.hours.reduce((sum, h) => sum + (hours[h] ?? 0), 0))
		)
	);
	const maxCell = $derived(Math.max(1, ...grid.flat()));
	const topic = (key: string) => (TOPIC_LABELS as Record<string, string>)[key] ?? key;
</script>

<section class="break-inside-avoid">
	{@render sectionHead('patterns', 'Posts and reviews over time', 'What followed what')}

	<div class="flex flex-col gap-8">
		{#if buzz}
			<div class="break-inside-avoid">
				<p class="m-0 mb-3 text-[15px] leading-snug">{buzz.sentence}</p>
				<div class="overflow-x-auto">
					<table class="w-full min-w-[26rem] border-collapse text-xs">
						<caption class="sr-only">Views and new Google reviews by week</caption>
						<thead>
							<tr>
								<th class="w-28"></th>
								{#each buzz.weeks as week (week.week)}
									<th
										scope="col"
										class={[
											'px-1 pb-1 text-left font-normal',
											week.week === buzz.peakWeek ? 'text-ink' : 'text-muted-foreground'
										]}>{weekLabel(week.week)}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr class="border-line border-t">
								<th scope="row" class="py-2 pr-2 text-left align-bottom text-sm font-medium"
									>Views</th>
								{#each buzz.weeks as week (week.week)}
									<td class="px-1 py-2 align-bottom">
										<div class="bg-wash flex h-9 items-end rounded-[3px]">
											{#if week.views}<span
													class="bg-ink block w-full rounded-t-[3px]"
													style:height={`${Math.max(4, (week.views / maxViews) * 100)}%`}
												></span>{/if}
										</div>
										<span class="mt-1 block font-medium tabular-nums">{compact(week.views)}</span>
									</td>
								{/each}
							</tr>
							<tr class="border-line border-t">
								<th scope="row" class="py-2 pr-2 text-left align-bottom font-normal">
									<span class="block text-sm font-medium">New reviews</span>
									<span class="text-muted-foreground block text-[11px] leading-tight"
										>usually {buzz.baselinePerWeek} a week</span>
								</th>
								{#each buzz.weeks as week (week.week)}
									<td class="px-1 py-2 align-bottom">
										<div class="bg-wash relative flex h-9 items-end rounded-[3px]">
											{#if week.reviews}<span
													class={[
														'block w-full rounded-t-[3px]',
														week.week === buzz.followingWeek ? 'bg-primary-darker' : 'bg-strip-muted'
													]}
													style:height={`${Math.max(4, (week.reviews / maxReviews) * 100)}%`}
												></span>{/if}
											<span
												class="border-ink/50 absolute inset-x-0 border-t border-dashed"
												style:bottom={`${(buzz.baselinePerWeek / maxReviews) * 100}%`}></span>
										</div>
										<span class="mt-1 block font-medium tabular-nums">{week.reviews}</span>
									</td>
								{/each}
							</tr>
						</tbody>
					</table>
				</div>
				<p class="text-muted-foreground m-0 mt-1 text-xs">
					The dashed line is your usual pace, from the six months before.
				</p>
			</div>
		{/if}

		{#if times}
			<div class="break-inside-avoid">
				<p class="m-0 mb-3 text-[15px] leading-snug">{times.sentence}</p>
				<table class="border-collapse text-xs">
					<caption class="sr-only"
						>Reviews with a complaint by weekday and part of the day they were posted</caption>
					<thead>
						<tr>
							<th></th>
							{#each PARTS as part (part.key)}
								<th scope="col" class="text-muted-foreground px-0.5 pb-1 font-normal"
									>{part.label}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each grid as row, d (d)}
							<tr>
								<th scope="row" class="text-muted-foreground pr-2 text-left font-normal"
									>{DAYS[d]}</th>
								{#each row as n, p (p)}
									<td class="p-0.5">
										<span
											class={[
												'grid h-7 w-16 place-items-center rounded-[3px] tabular-nums',
												n ? 'bg-beet text-white' : 'bg-wash text-muted-foreground'
											]}
											style:opacity={n ? 0.35 + 0.65 * (n / maxCell) : 1}>{n || ''}</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
				<ul class="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-sm">
					{#each times.topics as t (t.topic)}
						<li>
							<span class="font-medium first-letter:uppercase">{topic(t.topic)}</span>:
							{t.there} of {t.reviews} on {DAYS[['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].indexOf(t.day)]}
							{t.daypart}
							<span class="text-muted-foreground"
								>(when {Math.round(t.usualShare * 100)} % of all reviews are posted{t.busyness !== undefined
									? `; Google shows you at ${t.busyness} % then`
									: ''})</span>
						</li>
					{/each}
				</ul>
				<p class="text-muted-foreground m-0 mt-1 text-xs">
					By when the review was posted, over the last six months ({times.written} written reviews);
					most people write it the same day as the visit.
				</p>
			</div>
		{/if}

		{#if paid}
			<div class="break-inside-avoid">
				<p class="m-0 mb-3 text-[15px] leading-snug">{paid.sentence}</p>
				<table class="w-full max-w-md border-collapse text-sm">
					<caption class="sr-only">Paid or gifted posts against organic posts</caption>
					<thead>
						<tr class="text-muted-foreground text-xs">
							<th></th>
							<th scope="col" class="pb-1 text-right font-normal">Posts</th>
							<th scope="col" class="pb-1 text-right font-normal">Median views</th>
							<th scope="col" class="pb-1 text-right font-normal">Reviews the week after</th>
						</tr>
					</thead>
					<tbody>
						{#each [{ label: 'Paid or gifted', g: paid.paid }, { label: 'Organic', g: paid.organic }] as row (row.label)}
							<tr class="border-line border-t">
								<th scope="row" class="py-1.5 text-left font-normal">{row.label}</th>
								<td class="py-1.5 text-right tabular-nums">{row.g.posts}</td>
								<td class="py-1.5 text-right tabular-nums">{compact(row.g.medianViews)}</td>
								<td class="py-1.5 text-right font-semibold tabular-nums">{row.g.reviewsAfter}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
