<script lang="ts">
	import type { AdminPostCommentsOutputDto } from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The comments the monthly SCRAPE_COMMENTS step stored under the post (a report venue's top
	// TikTok posts only), most liked first, with what ANALYSE_COMMENTS read in each. No authors.
	interface Props {
		postId: string;
	}

	let { postId }: Props = $props();

	let res = $state<AdminPostCommentsOutputDto | null>(null);
	const loader = createAutoLoader(api.admin.listPostComments, [postId], {
		onSuccess: (r) => (res = r)
	});

	const INTENTS: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'quiet' }> = {
		intent: { label: 'wants to go', variant: 'success' },
		confirmation: { label: 'been, agrees', variant: 'success' },
		disagreement: { label: 'disagrees', variant: 'destructive' },
		question: { label: 'asks', variant: 'warning' },
		tag: { label: 'tags a friend', variant: 'quiet' },
		other: { label: 'other', variant: 'quiet' }
	};
	const counts = $derived(
		Object.entries(
			(res?.comments ?? []).reduce<Record<string, number>>((acc, c) => {
				if (c.intent) acc[c.intent] = (acc[c.intent] ?? 0) + 1;
				return acc;
			}, {})
		)
	);
</script>

<AdminPanel title="Comments" note={res?.comments.length || undefined}>
	{#if loader.error && !res}
		<ErrorState onRetry={() => loader.load(postId)} />
	{:else if !res}
		<SkeletonRows count={3} lines={1} />
	{:else if !res.scrapedAt}
		<p class="text-muted-foreground m-0 text-sm">
			Not scraped. The monthly run scrapes the comments of each report venue's five most viewed
			TikTok posts.
		</p>
	{:else if !res.comments.length}
		<p class="text-muted-foreground m-0 text-sm">Scraped {onDay(res.scrapedAt)}: no comments came back.</p>
	{:else}
		{#if counts.length}
			<p class="text-muted-foreground m-0 mb-2 text-xs">
				{counts.map(([intent, n]) => `${n} ${INTENTS[intent]?.label ?? intent}`).join(' · ')}
			</p>
		{/if}
		{#if res.disagreement}
			<p class="bg-tint m-0 mb-3 rounded-md px-3 py-2 text-sm">{res.disagreement}</p>
		{/if}
		<ul class="divide-line m-0 flex max-h-[32rem] list-none flex-col divide-y overflow-y-auto p-0 text-sm">
			{#each res.comments as comment (comment.id)}
				<li class="flex items-start gap-3 py-2">
					<span class="min-w-0 flex-1">
						<span class="block break-words">{comment.text}</span>
						{#if comment.question}
							<span class="text-muted-foreground block text-xs"
								>{comment.questionTopic}: “{comment.question}”</span>
						{/if}
					</span>
					<span class="flex shrink-0 flex-col items-end gap-1">
						{#if comment.intent}
							<Badge variant={INTENTS[comment.intent]?.variant ?? 'quiet'}
								>{INTENTS[comment.intent]?.label ?? comment.intent}</Badge>
						{:else}
							<span class="text-muted-foreground text-xs">not analysed</span>
						{/if}
						<span class="text-muted-foreground text-xs tabular-nums">{comment.likes} likes</span>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</AdminPanel>
