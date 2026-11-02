<script lang="ts">
	import type { AdminTermsOutputDto, GetTermsParamsStatusEnum } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The wordings linked to a topic of any kind in the city: what reviews, posts and Google's
	// tags call it, each wording's uses counting for the topic, most used first. A wording opens
	// the Trends "Terms" tab on it, where its topics are changed
	interface Props {
		cityId: string;
		topicKey: string;
		label: string;
	}

	let { cityId, topicKey, label }: Props = $props();

	const SHOWN = 20;
	let data = $state<AdminTermsOutputDto | null>(null);
	const loader = createLoader(
		(query: { cityId: string; topicKey: string }) =>
			api.admin.getTerms({ ...query, status: 'linked' as GetTermsParamsStatusEnum, limit: SHOWN }),
		{ onSuccess: (res) => (data = res) }
	);
	$effect(() => {
		data = null;
		if (cityId) loader.load({ cityId, topicKey });
	});

	const DECIDED: Record<string, string> = { match: 'by its name', ai: 'by the AI', admin: 'by an admin' };
	const uses = (notes: number, tagVenues: number) =>
		`${notes} ${notes === 1 ? 'note' : 'notes'}, ${tagVenues} ${tagVenues === 1 ? "venue's" : "venues'"} Google tags`;
	const tabHref = (params: Record<string, string>) =>
		`/admin/trends?${new URLSearchParams({ tab: 'terms', cityId, status: 'linked', ...params })}`;
</script>

<AdminPanel title="Wordings" note={data ? data.total.toLocaleString('en-GB') : undefined}>
	{#if loader.error && !data}
		<ErrorState onRetry={() => loader.load({ cityId, topicKey })} />
	{:else if !data}
		<SkeletonRows count={5} lines={1} trailing />
	{:else if !data.total}
		<EmptyState
			title="No wording counts for it yet"
			hint={`No wording in the city's reviews, posts or Google tags is linked to ${label}.`}
			ground="none"
			size="sm" />
	{:else}
		<p class="text-muted-foreground m-0 mb-3 text-sm">
			What reviews, posts and Google's tags call it: each wording's uses count for {label}. A wording opens it in Terms,
			where you can change its topics.
		</p>
		<ul class="m-0 grid list-none grid-cols-1 gap-x-8 p-0 text-sm sm:grid-cols-2">
			{#each data.terms as row (row.id)}
				<li class="flex items-baseline justify-between gap-3 border-t py-1.5">
					<a class="min-w-0 truncate underline-offset-2 hover:underline" href={tabHref({ status: 'all', q: row.name })} title={row.name}>
						{row.name}
					</a>
					<span class="text-muted-foreground shrink-0 text-xs tabular-nums" title={uses(row.notes, row.tagVenues)}>
						{row.notes + row.tagVenues} · {row.decidedBy ? DECIDED[row.decidedBy] : ''}
					</span>
				</li>
			{/each}
		</ul>
		{#if data.total > data.terms.length}
			<a class="text-beet mt-3 inline-block text-sm underline-offset-2 hover:underline" href={tabHref({ topic: topicKey })}>
				All {data.total.toLocaleString('en-GB')} wordings →
			</a>
		{/if}
	{/if}
</AdminPanel>
