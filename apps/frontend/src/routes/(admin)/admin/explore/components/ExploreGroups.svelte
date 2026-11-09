<script lang="ts">
	import type { AdminExploreGroupsOutputDto } from 'client';

	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// What they say, grouped by meaning: X's claims whose vectors sit close together, largest
	// first, each with a few of its claims said in different ways. A reading aid, never a count a
	// report quotes.
	interface Props {
		data: AdminExploreGroupsOutputDto | null;
	}

	let { data }: Props = $props();

	const n = (value: number) => value.toLocaleString('en-GB');
	const TONES: Record<string, string> = { positive: 'text-success', negative: 'text-destructive' };
</script>

{#if !data}
	<SkeletonRows count={4} lines={2} />
{:else if !data.embedded}
	<p class="text-muted-foreground m-0 text-sm">
		{#if data.notEmbedded}
			None of these {n(data.notEmbedded)} claims has a vector yet, so they can't be grouped by meaning: the
			<a class="text-beet" href="/admin/data?tab=backlogs">claim embeddings backlog</a> fills them once it is allowed to run. The table below lists them all.
		{:else}
			No claim to group.
		{/if}
	</p>
{:else if !data.groups.length}
	<p class="text-muted-foreground m-0 text-sm">
		No claims here say the same thing often enough to group ({n(data.considered)} read{data.notEmbedded ? `, ${n(data.notEmbedded)} without a vector yet` : ''}).
	</p>
{:else}
	<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
		{#each data.groups as group, i (i)}
			<li class="flex flex-col gap-1.5 py-2.5">
				<div class="flex flex-col gap-0.5">
					<p class="m-0 text-sm font-medium">
						{n(group.claims)} claims from {n(group.sources)} reviews and posts
						<span class="text-muted-foreground font-normal">
							· <span class="text-success">{n(group.praise)} praise</span> · <span class="text-destructive">{n(group.complaints)} complaints</span>
						</span>
					</p>
				</div>
				<ul class="m-0 flex list-none flex-col gap-0.5 p-0 text-sm">
					{#each group.samples as sample (sample.id)}
						<li>
							<span class={TONES[sample.sentiment ?? ''] ?? 'text-ink'}>“{sample.text}”</span>
							{#if sample.brandName}<span class="text-muted-foreground text-xs"> · {sample.brandName}</span>{/if}
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
	<p class="text-muted-foreground m-0 mt-1 text-xs">
		From {n(data.considered)} claims with a vector{data.notEmbedded ? `; ${n(data.notEmbedded)} more have none yet` : ''}{data.more ? `; ${n(data.more)} smaller groups not listed` : ''}.
	</p>
{/if}
