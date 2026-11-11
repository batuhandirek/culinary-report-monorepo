<script lang="ts">
	import { Star } from '@lucide/svelte';
	import type { AdminVenueOutputDto } from 'client';

	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import RatingChart from '#components/admin/RatingChart.svelte';

	// Its Google rating over time: the stars and the all-time review count as each read saw it, two
	// lines on one time axis (`RatingChart`), and the all-time split by stars from its detail page.
	interface Props {
		venue: AdminVenueOutputDto;
		onReviews: () => void;
	}

	let { venue, onReviews }: Props = $props();

	const reads = $derived(venue.snapshots.filter((s) => s.reviewsCount != null));
	const first = $derived(reads[0]);
	const shortDay = (date: string) =>
		new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });

	const points = $derived(
		reads.map((r) => ({ date: r.snapshotDate, ...(r.rating != null && { stars: r.rating }), reviews: r.reviewsCount! }))
	);

	const STARS = [
		{ key: 'fiveStar', label: '5★', color: '#3d6b14' },
		{ key: 'fourStar', label: '4★', color: '#8db85a' },
		{ key: 'threeStar', label: '3★', color: '#d9b54a' },
		{ key: 'twoStar', label: '2★', color: '#d9874a' },
		{ key: 'oneStar', label: '1★', color: '#b4321e' }
	] as const;
	const distribution = $derived(venue.details?.reviewsDistribution);
	const total = $derived(distribution ? STARS.reduce((sum, s) => sum + distribution[s.key], 0) : 0);
	const share = (n: number) => Math.round((n / total) * 100);
</script>

<DetailCard title="Google rating" icon={Star} note={reads.length ? `${reads.length} reads since ${shortDay(first!.snapshotDate)}` : undefined}>
	{#snippet aside()}
		<a href="?tab=reviews" onclick={(e) => (e.preventDefault(), onReviews())}>Reviews →</a>
	{/snippet}
	{#if points.length > 1}
		<div class="pb-2.5"><RatingChart {points} height={48} /></div>
	{:else}
		<p class="text-muted-foreground m-0 pb-2.5 text-xs">
			{reads.length ? 'One read so far: the line starts with the next.' : 'No rating read yet.'}
		</p>
	{/if}
	{#if distribution && total}
		<div class="flex h-2 gap-px overflow-hidden rounded" role="img" aria-label="Google reviews by stars, all time">
			{#each STARS as s (s.key)}
				{#if distribution[s.key]}<i class="block" style:width="{(distribution[s.key] / total) * 100}%" style:background={s.color}></i>{/if}
			{/each}
		</div>
		<div class="text-muted-foreground mt-[5px] flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] tabular-nums">
			{#each STARS as s (s.key)}
				<span><b class="text-ink">{s.label}</b> {distribution[s.key].toLocaleString('en')}{share(distribution[s.key]) >= 3 ? ` · ${share(distribution[s.key])} %` : ''}</span>
			{/each}
		</div>
	{/if}
</DetailCard>
