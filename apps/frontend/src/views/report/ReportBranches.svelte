<script lang="ts">
	import type { ReportBrand } from 'client';

	import { compact, monthLabel, TOPIC_LABELS } from '#lib/culinary.js';

	// A chain's branches side by side: each one's own posts (those that named it) and its
	// Google reviews, then what guests criticise and praise where a branch has enough reviews.
	interface Props {
		brand: ReportBrand;
		month: string;
	}

	let { brand, month }: Props = $props();

	const MIN_WRITTEN = 5;
	const rows = $derived(brand.branches);
	const reviewRows = $derived(rows.filter((row) => row.reviews.written >= MIN_WRITTEN));
	const best = (pick: (row: (typeof rows)[number]) => number | undefined) =>
		Math.max(...rows.map((row) => pick(row) ?? -Infinity));
	const topicColumns = (kind: 'praise' | 'complaints') =>
		Object.keys(TOPIC_LABELS)
			.filter((t) => t !== 'other')
			.map((t) => ({
				topic: t,
				max: Math.max(
					0,
					...reviewRows.map((row) => (row.reviews[kind][t] ?? 0) / row.reviews.written)
				)
			}))
			.filter((c) => c.max > 0)
			.sort((a, b) => b.max - a.max)
			.slice(0, 4)
			.map((c) => c.topic);
	const brandOnlyNote = $derived(
		brand.brandOnlyPosts
			? `${brand.brandOnlyPosts} ${brand.brandOnlyPosts === 1 ? 'post' : 'posts'} named ${brand.name} without saying which branch: they count for the brand above, not for a branch.`
			: ''
	);
	const replyRate = (rate?: number) => (rate === undefined ? '—' : `${Math.round(rate * 100)} %`);
</script>

<div class="border-line overflow-x-auto rounded-md border break-inside-avoid">
	<table class="w-full border-collapse text-[13px]">
		<thead class="bg-wash/60 text-muted-foreground text-[11px]">
			<tr>
				<th class="px-3 py-2 text-left font-medium">Branch</th>
				<th class="px-2 py-2 text-right font-medium">Posts</th>
				<th class="px-2 py-2 text-right font-medium">Views</th>
				<th class="px-2 py-2 text-right font-medium">Reviews</th>
				<th class="px-2 py-2 text-right font-medium">Stars</th>
				<th class="px-2 py-2 text-right font-medium">Replied</th>
				<th class="px-3 py-2 text-right font-medium">All time</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.venueId)}
				{@const cells = [
					{
						v: row.social.postCount,
						best: best((r) => r.social.postCount),
						text: `${row.social.postCount}`
					},
					{
						v: row.social.views,
						best: best((r) => r.social.views),
						text: compact(row.social.views)
					},
					{
						v: row.reviews.count,
						best: best((r) => r.reviews.count),
						text: `${row.reviews.count}`
					},
					{
						v: row.reviews.avgStars,
						best: best((r) => r.reviews.avgStars),
						text: row.reviews.avgStars ? row.reviews.avgStars.toFixed(1) : '—'
					},
					{
						v: row.reviews.replyRate,
						best: best((r) => r.reviews.replyRate),
						text: replyRate(row.reviews.replyRate)
					}
				]}
				<tr class={['border-line border-t', row.described && 'bg-primary/35']}>
					<td class="px-3 py-2">
						<span class={['block truncate', row.described && 'font-semibold']}
							>{row.street ?? row.name}</span>
						<span class="text-muted-foreground block truncate text-[10px]"
							>{[row.city, row.district, row.described && 'place figures: this one']
								.filter(Boolean)
								.join(' · ')}</span>
					</td>
					{#each cells as cell, i (i)}
						<td
							class={[
								'px-2 py-2 text-right tabular-nums',
								cell.v !== undefined &&
									cell.v === cell.best &&
									cell.v > 0 &&
									'font-semibold'
							]}>
							{cell.text}
						</td>
					{/each}
					<td class="text-muted-foreground px-3 py-2 text-right tabular-nums">
						{row.rating ? row.rating.toFixed(1) : '—'}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="text-muted-foreground m-0 mt-2 text-xs">
	Posts by other people that named the branch, and its Google reviews, from {monthLabel(month)};
	the leader in each column is bold. {brandOnlyNote}
</p>

{#if reviewRows.length >= 2}
	<div class="mt-8 grid grid-cols-1 gap-7">
		{#each [{ kind: 'complaints' as const, title: 'What guests criticise, by branch', bar: 'bg-beet' }, { kind: 'praise' as const, title: 'What guests praise, by branch', bar: 'bg-primary-darker' }] as matrix (matrix.kind)}
			{@const columns = topicColumns(matrix.kind)}
			{#if columns.length}
				<div class="break-inside-avoid">
					<h3 class="m-0 mb-3 text-base font-semibold">{matrix.title}</h3>
					<div
						class="grid items-end gap-x-2 gap-y-2 text-[12px]"
						style:grid-template-columns={`minmax(0,1fr) repeat(${columns.length}, minmax(0,6.5rem))`}>
						<span></span>
						{#each columns as topic (topic)}
							<span
								class="text-muted-foreground text-center text-[11px] leading-tight"
								>{TOPIC_LABELS[topic]}</span>
						{/each}
						{#each reviewRows as row (row.venueId)}
							<span class={['truncate text-[13px]', row.described && 'font-semibold']}
								>{row.street ?? row.name}</span>
							{#each columns as topic (topic)}
								{@const share =
									(row.reviews[matrix.kind][topic] ?? 0) / row.reviews.written}
								<div class="flex flex-col items-center gap-0.5">
									<span class="tabular-nums">{Math.round(share * 100)}%</span>
									<span
										class="bg-wash block h-1.5 w-full overflow-hidden rounded-full">
										<span
											class="{matrix.bar} block h-full"
											style:width={`${share * 100}%`}></span>
									</span>
								</div>
							{/each}
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>
	<p class="text-muted-foreground m-0 mt-2 text-xs">
		Share of each branch's written Google reviews that raised the topic. Branches with fewer
		than {MIN_WRITTEN} written reviews this month are left out.
	</p>
{/if}
