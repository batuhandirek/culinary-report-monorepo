<script lang="ts">
	import type { AdminExploreGroupsOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The month's loose claims (under no aspect, or filed at a root because nothing finer fitted)
	// grouped by meaning: Explore's greedy grouping over the claims' vectors (`loose`), worked out on
	// each load and never stored. A big group no aspect covers is where an aspect may be missing.
	// Explore's population: own posts and claims of places matched to no brand are out.
	interface Props {
		cityId: string;
		month: string;
	}

	let { cityId, month }: Props = $props();

	let data = $state<AdminExploreGroupsOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; month: string }) =>
			api.admin.getExploreGroups({ cityId: query.cityId, from: query.month, to: query.month, loose: true }),
		{ onSuccess: (res) => (data = res) }
	);
	const load = () => loader.load({ cityId, month });
	$effect(() => {
		load();
	});
	const n = (v: number) => v.toLocaleString('en-GB');
</script>

<AdminPanel title="Unfiled, grouped by meaning" note={monthLabel(month)}>
	{#if loader.error && !data}
		<ErrorState onRetry={load} />
	{:else if !data}
		<SkeletonRows count={4} lines={2} />
	{:else if !data.groups.length}
		<EmptyState
			title={data.embedded ? 'No group of loose claims this month' : 'The loose claims have no vectors yet'}
			hint={data.embedded
				? `${n(data.considered)} loose claims were read and none gathered into a group.`
				: `Grouping by meaning reads each claim's vector; ${n(data.notEmbedded)} loose claims of the month have none yet.`}
			ground="none"
			size="sm" />
	{:else}
		<p class="text-muted-foreground m-0 mb-3 text-sm">
			{n(data.considered)} claims under no aspect or at a root{data.notEmbedded ? ` (${n(data.notEmbedded)} more without a vector)` : ''},
			grouped by meaning. A reading aid that shifts with each load: a big group no aspect covers may be an aspect missing.
		</p>
		<ul class="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
			{#each data.groups as group, i (i)}
				<li class="border-line rounded-md border p-3">
					<p class="m-0 text-xs">
						<span class="font-semibold tabular-nums">{n(group.claims)} claims</span>
						<span class="text-muted-foreground">
							· {n(group.sources)} sources · {n(group.praise)} praise · {n(group.complaints)} complaints
						</span>
					</p>
					<ul class="m-0 mt-1.5 list-disc pl-4 text-sm">
						{#each group.samples as sample (sample.id)}
							<li>
								{sample.text}{#if sample.brandName}<span class="text-muted-foreground text-xs"> · {sample.brandName}</span>{/if}
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
		{#if data.more}
			<p class="text-muted-foreground m-0 mt-2 text-xs">{n(data.more)} smaller groups not shown.</p>
		{/if}
	{/if}
</AdminPanel>
