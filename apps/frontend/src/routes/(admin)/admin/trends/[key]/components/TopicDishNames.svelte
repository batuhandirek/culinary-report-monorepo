<script lang="ts">
	import type { AdminDishNamesOutputDto, GetDishNamesParamsStatusEnum } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// A dish or drink topic's dish names in the city: what guests call it in reviews and posts, each
	// name's notes counting for the topic, most noted first. A name opens the Trends "Dish names" tab
	// on it, where its topic is changed
	interface Props {
		cityId: string;
		topicKey: string;
		label: string;
	}

	let { cityId, topicKey, label }: Props = $props();

	const SHOWN = 20;
	let data = $state<AdminDishNamesOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; topicKey: string }) =>
			api.admin.getDishNames({ ...query, status: 'linked' as GetDishNamesParamsStatusEnum, limit: SHOWN }),
		{ onSuccess: (res) => (data = res) }
	);
	$effect(() => {
		data = null;
		if (cityId) loader.load({ cityId, topicKey });
	});

	const DECIDED: Record<string, string> = { match: 'by its name', ai: 'by the AI', admin: 'by an admin' };
	const tabHref = (params: Record<string, string>) =>
		`/admin/trends?${new URLSearchParams({ tab: 'dishes', cityId, status: 'linked', ...params })}`;
</script>

<AdminPanel title="Dish names" note={data ? data.total.toLocaleString('en-GB') : undefined}>
	{#if loader.error && !data}
		<ErrorState onRetry={() => loader.load({ cityId, topicKey })} />
	{:else if !data}
		<SkeletonRows count={5} lines={1} trailing />
	{:else if !data.total}
		<EmptyState
			title="No dish name counts for it yet"
			hint={`No name in the city's reviews and posts is sorted under ${label}.`}
			ground="none"
			size="sm" />
	{:else}
		<p class="text-muted-foreground m-0 mb-3 text-sm">
			What guests call it in reviews and posts: each name's notes count for {label}. A name opens it in Dish names,
			where you can move it to another topic.
		</p>
		<ul class="m-0 grid list-none grid-cols-1 gap-x-8 p-0 text-sm sm:grid-cols-2">
			{#each data.names as row (row.id)}
				<li class="flex items-baseline justify-between gap-3 border-t py-1.5">
					<a class="min-w-0 truncate underline-offset-2 hover:underline" href={tabHref({ status: 'all', q: row.name })} title={row.name}>
						{row.name}
					</a>
					<span class="text-muted-foreground shrink-0 text-xs tabular-nums">
						{row.notes} · {row.decidedBy ? DECIDED[row.decidedBy] : ''}
					</span>
				</li>
			{/each}
		</ul>
		{#if data.total > data.names.length}
			<a class="text-beet mt-3 inline-block text-sm underline-offset-2 hover:underline" href={tabHref({ topic: topicKey })}>
				All {data.total.toLocaleString('en-GB')} names →
			</a>
		{/if}
	{/if}
</AdminPanel>
