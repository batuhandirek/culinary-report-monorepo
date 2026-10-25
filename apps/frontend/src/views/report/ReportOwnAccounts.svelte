<script lang="ts">
	import type { ReportOwnAccount, ReportPost } from 'client';

	import { compact, PLATFORM_LABELS } from '#lib/culinary.js';

	// "From your own account": the venue's own posts this month (never counted as word of mouth)
	// and its accounts at the month's close, with follower growth and how creators' posts did
	// against its own.
	interface Props {
		ownPosts: ReportPost[];
		accounts?: ReportOwnAccount[];
	}

	let { ownPosts, accounts = [] }: Props = $props();

	const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${compact(Math.abs(n))}`;
</script>

<div class="border-line mt-8 rounded-md border border-dashed p-5 break-inside-avoid">
	<p class="stamp text-muted-foreground m-0">From your own account</p>
	{#if ownPosts.length}
		<p class="m-0 mt-1 mb-3 text-base font-semibold">
			{ownPosts.length}
			{ownPosts.length === 1 ? 'post' : 'posts'},
			{compact(ownPosts.reduce((sum, p) => sum + p.views, 0))} views
			<span class="text-muted-foreground text-sm font-normal">· not counted above</span>
		</p>
		<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
			{#each ownPosts.slice(0, 4) as post (post.postId)}
				<li class="flex items-baseline gap-3 text-[13px]">
					<span class="w-12 shrink-0 font-semibold tabular-nums">{compact(post.views)}</span>
					<span class="text-reading-ink min-w-0 truncate">{post.summary}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if accounts.length}
		<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each accounts as account (`${account.platform}:${account.handle}`)}
				<a
					href={account.url}
					target="_blank"
					rel="noreferrer"
					class="bg-paper border-line hover:border-ink/40 rounded-md border px-4 py-3 no-underline">
					<p class="text-muted-foreground m-0 text-[11px]">
						{PLATFORM_LABELS[account.platform]} · @{account.handle}{account.branch
							? ` · ${account.branch}`
							: ''}
					</p>
					<p class="text-ink font-display m-0 mt-1 text-[26px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
						{account.followers !== undefined ? compact(account.followers) : '—'}
						<span class="text-muted-foreground font-sans text-sm font-normal tracking-normal">followers</span>
						{#if account.followersChange !== undefined}
							<span
								class="font-sans text-sm font-semibold tracking-normal {account.followersChange < 0
									? 'text-muted-foreground'
									: 'text-primary-darker'}">{signed(account.followersChange)}</span>
						{/if}
					</p>
					<p class="text-muted-foreground m-0 mt-1.5 text-xs">
						{#if account.avgViews !== undefined}{compact(account.avgViews)} views per post{/if}{#if account.postsLast30Days !== undefined}{account.avgViews !== undefined
								? ' · '
								: ''}{account.postsLast30Days} posts in 30 days{/if}
					</p>
					{#if account.creatorViewsMultiple !== undefined && account.creatorViewsMultiple >= 1.5}
						<p class="text-reading-ink m-0 mt-1.5 text-[13px] leading-snug">
							Creators' posts got <strong>{account.creatorViewsMultiple}×</strong> the views of
							yours.
						</p>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>
