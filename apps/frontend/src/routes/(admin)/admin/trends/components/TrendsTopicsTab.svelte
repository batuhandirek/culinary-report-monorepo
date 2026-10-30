<script lang="ts">
	import type { AdminTopicInsightRowOutputDto, AdminTopicInsightsOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import TopicTable from '#components/admin/topics/TopicTable.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { KIND_ITEMS } from '#lib/topic-kinds.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The city's food topics side by side: how many venues serve each (supply), how much posts
	// talk about it this month (buzz) and how Google searches for it move (demand). Rising buzz or
	// searches with few venues is a gap; a row opens the topic's own page
	interface Props {
		cityId: string;
		month: string;
		/** Bumped after a topic was saved */
		version: number;
	}

	let { cityId, month, version }: Props = $props();

	let data = $state<AdminTopicInsightsOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; month: string }) => api.admin.getTopicInsights(query),
		{ onSuccess: (res) => (data = res) }
	);
	$effect(() => {
		void version;
		data = null;
		if (cityId) loader.load({ cityId, month });
	});

	let kind = $state<string>('all');
	const SORTS = [
		{ value: 'posts', label: 'Most posted about' },
		{ value: 'gaining', label: 'Gaining in posts' },
		{ value: 'searched', label: 'Gaining in searches' },
		{ value: 'venues', label: 'Most venues' }
	] as const;
	let sort = $state<(typeof SORTS)[number]['value']>('posts');
	const sortKey: Record<typeof sort, (r: AdminTopicInsightRowOutputDto) => number> = {
		posts: (r) => r.posts,
		gaining: (r) => r.shareChange ?? -Infinity,
		searched: (r) => r.searchChange ?? -Infinity,
		venues: (r) => r.venues
	};
	const rows = $derived(
		(data?.topics ?? [])
			.filter((r) => kind === 'all' || r.kind === kind)
			.toSorted((a, b) => sortKey[sort](b) - sortKey[sort](a) || a.label.localeCompare(b.label))
	);
	const labelOf = (key: string) =>
		data?.topics.find((t) => t.key === key)?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
</script>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	{#if loader.error && !data}
		<ErrorState onRetry={() => loader.load({ cityId, month })} />
	{:else if !data}
		<AdminPanel><SkeletonRows count={10} lines={2} trailing /></AdminPanel>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap gap-1.5" role="group" aria-label="Type">
				{#each [{ value: 'all', label: 'All' }, ...KIND_ITEMS] as k (k.value)}
					<button type="button" class="chip text-xs" aria-pressed={kind === k.value} onclick={() => (kind = k.value)}>
						{k.label}
					</button>
				{/each}
			</div>
			<div class="flex flex-wrap gap-1.5" role="group" aria-label="Order">
				{#each SORTS as s (s.value)}
					<button type="button" class="chip text-xs" aria-pressed={sort === s.value} onclick={() => (sort = s.value)}>
						{s.label}
					</button>
				{/each}
			</div>
		</div>
		<AdminPanel title={`${rows.length} topics`} note={monthLabel(data.month)}>
			{#if !rows.length}
				<EmptyState title="No topic of this type has a signal" hint="No venue, post or search this month." ground="none" size="sm" />
			{:else}
				<p class="text-muted-foreground m-0 mb-3 text-sm">
					Venues: open food venues tagged with it or a topic under it ("mainly": it is their main food). Posts: this
					month's posts by others about its venues' food, and their share against last month in points. Google
					searches: each line is the topic against its own best month, so compare shapes, not heights.
				</p>
				<TopicTable {rows} months={data.months} {labelOf} />
			{/if}
		</AdminPanel>
	{/if}
</div>
