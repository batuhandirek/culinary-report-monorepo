<script lang="ts">
	import type { AdminMissingAspectOutputDto, AdminStatementClustersOutputDto, AdminTopicOutputDto } from 'client';

	import MissingAspectsView from './MissingAspectsView.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { quarterLabel } from '#lib/food-trends.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// "Missing aspects": the month's (or its quarter's) claims no aspect fits, grouped by meaning
	// (`GET /admin/statements/clusters`, worked out on request and kept in memory a few hours), each
	// with a suggested aspect to create in the topic dialog and its claims one click away.
	interface Props {
		cityId: string;
		month: string;
		/** Opens the topic dialog for a new aspect */
		onCreateAspect: (label: string, parent: string | undefined, hint: string) => void;
	}

	let { cityId, month, onCreateAspect }: Props = $props();

	let span = $state<'month' | 'quarter'>('month');
	let root = $state<string>('all');
	const quarter = $derived(`${month.slice(0, 4)}-q${Math.ceil(Number(month.slice(5, 7)) / 3)}`);

	let roots = $state<AdminTopicOutputDto[]>([]);
	$effect(() => {
		api.admin.getTopics({ cityId }).then((res) => (roots = res.topics.filter((t) => t.kind === 'aspect' && !t.parentKey)));
	});
	const rootLabel = (key: string) => roots.find((r) => r.key === key)?.label ?? key;
	const ROOT_ITEMS = $derived([
		{ value: 'all', label: 'No aspect or a root' },
		{ value: 'none', label: 'No aspect only' },
		...roots.map((r) => ({ value: r.key, label: `Filed at ${r.label}` }))
	]);

	let result = $state<AdminStatementClustersOutputDto | null>(null);
	const loader = createLoader(
		(query: Parameters<typeof api.admin.getStatementClusters>[0]) => api.admin.getStatementClusters(query),
		{ onSuccess: (res) => (result = res) }
	);
	const query = $derived({
		cityId,
		...(span === 'month' ? { month } : { quarter }),
		...(root !== 'all' && { root })
	});
	$effect(() => {
		result = null;
		loader.load(query);
	});

	const seeClaims = (cluster: AdminMissingAspectOutputDto) => {
		const url = new URL(page.url.href);
		for (const name of [...url.searchParams.keys()]) if (!['cityId', 'month'].includes(name)) url.searchParams.delete(name);
		url.searchParams.set('tab', 'claims');
		url.searchParams.set('like', cluster.like);
		goto(url);
	};
</script>

<div class="flex min-w-0 flex-col gap-4 pb-12">
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex gap-1" role="group" aria-label="Span">
			<button type="button" class="chip text-xs" aria-pressed={span === 'month'} onclick={() => (span = 'month')}>
				{monthLabel(month)}
			</button>
			<button type="button" class="chip text-xs" aria-pressed={span === 'quarter'} onclick={() => (span = 'quarter')}>
				{quarterLabel(quarter)}
			</button>
		</div>
		<div class="w-56">
			<Select items={ROOT_ITEMS} value={root} aria-label="Claims" size="sm" onValueChange={(v) => (root = v ?? 'all')} />
		</div>
	</div>

	{#if loader.error && !result}
		<ErrorState onRetry={() => loader.load(query)} />
	{:else if !result}
		<p class="text-muted-foreground m-0 text-sm">Grouping the claims and naming each group takes a few seconds the first time.</p>
		<SkeletonRows count={4} lines={3} />
	{:else}
		<MissingAspectsView
			{result}
			{rootLabel}
			onCreateAspect={(cluster) => onCreateAspect(cluster.label ?? '', cluster.root, cluster.hint ?? '')}
			onSeeClaims={seeClaims} />
	{/if}
</div>
