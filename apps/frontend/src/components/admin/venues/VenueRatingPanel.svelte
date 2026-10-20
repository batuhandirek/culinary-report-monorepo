<script lang="ts">
	import type { AdminVenueOutputDto } from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';

	// The place's all-time Google rating and review count as each scrape saw it, newest first.
	// The bar is the rating on a 1–5 scale.
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	const snapshots = $derived([...venue.snapshots].reverse());
</script>

<AdminPanel title="Google rating over time" note={snapshots.length}>
	{#if snapshots.length}
		<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
			{#each snapshots as snapshot (snapshot.snapshotDate)}
				<li class="flex items-center gap-3 py-2">
					<span class="text-muted-foreground w-28 shrink-0 tabular-nums"
						>{onDay(snapshot.snapshotDate)}</span>
					<span class="bg-wash h-2 flex-1 overflow-hidden rounded-full">
						<span
							class="bg-primary-darker block h-full rounded-full"
							style={`width: ${(((snapshot.rating ?? 1) - 1) / 4) * 100}%`}></span>
					</span>
					<span class="w-12 shrink-0 text-right font-medium tabular-nums">
						{snapshot.rating?.toFixed(1) ?? '—'}
					</span>
					<span class="text-muted-foreground w-24 shrink-0 text-right text-xs tabular-nums">
						{snapshot.reviewsCount ?? 0} reviews
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-muted-foreground m-0 text-sm">No rating recorded yet.</p>
	{/if}
</AdminPanel>
