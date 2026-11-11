<script lang="ts">
	import { Info } from '@lucide/svelte';
	import type { AdminSocialPostOutputDto } from 'client';

	import { atShort, onDay } from '#components/admin/admin-format.js';
	import PipelineStrip, { type Step } from '#components/admin/digestion/PipelineStrip.svelte';
	import { compact } from '#lib/culinary.js';

	// The post's figures in one card: its counts (when they were read in the hint: posts are
	// compared at seven days), the place the creator tagged, when agent A read it; then how far the
	// pipeline got, step by step. A blog article has no counts and no tagged place.
	interface Props {
		post: AdminSocialPostOutputDto;
		steps: Step[];
	}

	let { post, steps }: Props = $props();

	const isBlog = $derived(post.platform === 'blog');

	// How long after the post a read was: counts are compared at seven days
	const afterPosting = (date: Date | string) => {
		const days = Math.floor((new Date(date).getTime() - new Date(post.postedAt).getTime()) / 86_400_000);
		return days < 1 ? 'the day it was posted' : `${days} day${days === 1 ? '' : 's'} after posting`;
	};
	const countsNote = $derived(
		!post.countsAt
			? 'Not read yet'
			: post.countsFinalAt && new Date(post.countsFinalAt) > new Date(post.countsAt)
				? `Last read ${afterPosting(post.countsAt)}; gone (deleted or private) by ${onDay(post.countsFinalAt)}`
				: post.countsFinalAt
					? `Read ${afterPosting(post.countsAt)}, kept`
					: `Read ${afterPosting(post.countsAt)}; read again at seven days`
	);
	const counts = $derived(
		isBlog
			? []
			: [
					{ label: 'Likes', n: post.likes },
					{ label: 'Comments', n: post.comments },
					// Instagram gives no shares
					...(post.platform === 'tiktok' ? [{ label: 'Shares', n: post.shares }] : []),
					{ label: 'Saves', n: post.saves }
				]
	);
</script>

<div class="bg-paper border-line flex flex-wrap items-center gap-y-1.5 rounded-md border px-1.5 py-1">
	<dl class="m-0 flex flex-[1_1_520px] flex-wrap items-center gap-x-5 gap-y-1 px-2 py-0.5 text-[13px]">
		{#if !isBlog}
			<div class="flex items-baseline gap-1.5 whitespace-nowrap">
				<dt class="text-muted-foreground text-xs">Views</dt>
				<dd class="m-0 inline-flex items-center gap-1.5">
					<b class="tabular-nums">{compact(post.views)}</b>
					{#if post.snapshots.length > 1}
						<a href="#counts" class="text-muted-foreground hover:text-ink" title={`${countsNote}. Every read below`} aria-label="Counts over time"><Info class="size-3" /></a>
					{:else}
						<span class="text-muted-foreground" title={countsNote}><Info class="size-3" aria-label={countsNote} /></span>
					{/if}
				</dd>
			</div>
			{#each counts as count (count.label)}
				<div class="flex items-baseline gap-1.5 whitespace-nowrap">
					<dt class="text-muted-foreground text-xs">{count.label}</dt>
					<dd class="m-0 font-bold tabular-nums">{compact(count.n)}</dd>
				</div>
			{/each}
			<div class="flex min-w-0 items-baseline gap-1.5">
				<dt class="text-muted-foreground text-xs whitespace-nowrap">Tagged place</dt>
				<dd class={['m-0 truncate', !post.locationName && 'text-muted-foreground']} title={post.locationName ? 'The place the creator tagged' : undefined}>{post.locationName ?? '—'}</dd>
			</div>
		{/if}
		<div class="flex items-baseline gap-1.5 whitespace-nowrap">
			<dt class="text-muted-foreground text-xs">Analysed</dt>
			<dd class={['m-0', !post.analysedAt && 'text-muted-foreground']} title={post.analysisTokens ? `${post.analysisTokens.toLocaleString('en-GB')} tokens` : undefined}>
				{post.analysedAt ? atShort(post.analysedAt) : '—'}
			</dd>
		</div>
	</dl>
	<div class="border-line/70 flex flex-wrap items-center border-l pl-1.5">
		<PipelineStrip {steps} flat />
	</div>
</div>
