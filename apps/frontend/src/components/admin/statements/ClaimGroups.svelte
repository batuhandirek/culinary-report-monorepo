<script lang="ts">
	import type { AdminExploreGroupsOutputDto } from 'client';

	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// What they say, grouped by meaning: the claims (an Explore view's, a brand's or a branch's)
	// whose vectors sit close together, largest first, each with a few of its claims said in
	// different ways. A reading aid, never a count a report quotes. The bar (how alike, how many
	// claims) is moved here; unset is the API's default.
	interface GroupBar {
		similarity?: number;
		minClaims?: number;
	}
	interface Props {
		data: AdminExploreGroupsOutputDto | null;
		bar?: GroupBar;
		onBar?: (next: GroupBar) => void;
	}

	let { data, bar = {}, onBar }: Props = $props();

	const SIMILARITY = [
		{ value: 0.66, label: '0.66 · loosest' },
		{ value: 0.7, label: '0.70' },
		{ value: 0.74, label: '0.74' },
		{ value: 0.78, label: '0.78' },
		{ value: 0.82, label: '0.82 · default' },
		{ value: 0.86, label: '0.86' },
		{ value: 0.9, label: '0.90 · strictest' }
	];
	const MIN_CLAIMS = [2, 3, 5, 10, 20].map((v) => ({ value: v, label: `${v}+ claims` }));
	const similarity = $derived(bar.similarity ?? data?.similarity);
	const minClaims = $derived(bar.minClaims ?? data?.minClaims);

	const n = (value: number) => value.toLocaleString('en-GB');
	const TONES: Record<string, string> = { positive: 'text-success', negative: 'text-destructive' };
</script>

{#if onBar && (data?.embedded ?? true)}
	<div class="mb-2 flex flex-wrap items-center gap-1.5">
		<span class="text-muted-foreground text-xs">How alike</span>
		<Select
			items={SIMILARITY}
			value={similarity === undefined ? undefined : String(similarity)}
			aria-label="How alike claims must be to group"
			size="sm"
			onValueChange={(v) => onBar({ similarity: Number(v) })} />
		<span class="text-muted-foreground text-xs">at least</span>
		<Select
			items={MIN_CLAIMS}
			value={minClaims === undefined ? undefined : String(minClaims)}
			aria-label="Claims a group needs"
			size="sm"
			onValueChange={(v) => onBar({ minClaims: Number(v) })} />
		<span class="text-muted-foreground text-xs">from 2+ reviews and posts</span>
	</div>
{/if}

{#if !data}
	<SkeletonRows count={4} lines={2} />
{:else if !data.embedded}
	<p class="text-muted-foreground m-0 text-sm">
		{#if data.notEmbedded}
			None of these {n(data.notEmbedded)} claims has a vector yet, so they can't be grouped by meaning: the
			<a class="text-beet" href="/admin/data?tab=backlogs">claim embeddings backlog</a> fills them once it is allowed to run. The All tab lists them all.
		{:else}
			No claim to group.
		{/if}
	</p>
{:else if !data.groups.length}
	<p class="text-muted-foreground m-0 text-sm">
		No {n(data.minClaims)}+ claims from two or more reviews and posts are alike enough at {data.similarity.toFixed(2)} to group ({n(data.considered)} read{data.notEmbedded ? `, ${n(data.notEmbedded)} without a vector yet` : ''}). Try a lower bar above.
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
