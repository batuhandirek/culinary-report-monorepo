<script lang="ts">
	import { ArrowRight, CircleAlert, FileText, Info, ListTodo, Send } from '@lucide/svelte';
	import type {
		AdminBrandBranchOutputDto,
		AdminBrandMonthFiguresOutputDto,
		AdminBrandOutputDto,
		AdminBrandSummaryOutputDto
	} from 'client';

	import type { BrandProspectStore } from '../stores/BrandProspectStore.svelte.js';

	import { ago, onDay, prospectStageVariant } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import BrandAccounts from '#components/admin/BrandAccounts.svelte';
	import {
		compact,
		currentMonth,
		monthLabel,
		PLATFORM_LABELS,
		sentimentVariant
	} from '#lib/culinary.js';
	import { isDueToday, stageLabel } from '#lib/outreach-status.js';
	import Stat from '#ui/components/Stat.svelte';
	import { cn } from '#ui/lib/utils.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// How the brand did this month, against the month before and the five before that, what its
	// best posts were, and what to do about it. Every number links to the tab that lists it.
	interface Props {
		brand: AdminBrandOutputDto;
		month: string;
		cityId?: string;
		/** A one-place brand's place */
		place?: AdminBrandBranchOutputDto;
		/** The month's figures, loaded by the page (its tabs count from them); null while loading */
		summary: AdminBrandSummaryOutputDto | null;
		failed: boolean;
		onRetry: () => void;
		sales: BrandProspectStore;
		openTab: (tab: string) => void;
		onBuild: () => void;
		building: boolean;
	}

	let { brand, month, cityId, place, summary, failed, onRetry, sales, openTab, onBuild, building }: Props =
		$props();

	const chain = $derived(brand.branches.length > 1);
	const figures = $derived(summary?.figures);
	const before = $derived(summary?.previous);
	// "+3 on August": the change on the month before, when there is one
	const previousName = $derived(
		summary?.series.at(-2) ? monthLabel(summary.series.at(-2)!.month).split(' ')[0] : ''
	);
	const change = (key: keyof AdminBrandMonthFiguresOutputDto) => {
		const now = figures?.[key];
		const then = before?.[key];
		if (typeof now !== 'number' || typeof then !== 'number' || now === then) return undefined;
		const diff = now - then;
		const shown = key === 'views' ? compact(Math.abs(diff)) : Math.abs(diff).toString();
		return `${diff > 0 ? '+' : '−'}${shown} on ${previousName}`;
	};

	const TONES = {
		urgent: { icon: CircleAlert, class: 'text-destructive' },
		todo: { icon: ListTodo, class: 'text-ink' },
		info: { icon: Info, class: 'text-muted-foreground' }
	} as const;
	const TAB_LABELS: Record<string, string> = {
		posts: 'Posts',
		reviews: 'Reviews',
		branches: 'Branches',
		competitors: 'Competitors',
		signals: 'Signals',
		reports: 'Reports',
		sales: 'Sales',
		settings: 'Settings',
		overview: 'Overview'
	};

	// The six months on one scale per measure: a bar is the month against the busiest one
	const maxOf = (key: 'posts' | 'reviews') =>
		Math.max(1, ...(summary?.series.map((s) => s[key]) ?? [1]));
</script>

{#if failed}
	<ErrorState title="Couldn't load the month's figures" {onRetry} />
{:else}
	<div class="flex min-w-0 flex-col gap-5">
		{#if month === currentMonth()}
			<p class="ink-strip m-0 text-sm">
				{monthLabel(month)} is still going: the figures are what is stored so far.
			</p>
		{/if}
		<!-- What needs doing: each line opens the tab where it is done -->
		{#if summary && summary.todos.length}
			<AdminPanel title="What needs doing" note={summary.todos.length}>
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
					{#each summary.todos as todo (todo.key)}
						{@const tone = TONES[todo.tone]}
						<li>
							<button
								type="button"
								class="hover:bg-sand flex w-full cursor-pointer items-center gap-3 px-1 py-2.5 text-left"
								onclick={() => openTab(todo.tab)}>
								<tone.icon class={cn('size-4 shrink-0', tone.class)} />
								<span class={cn('min-w-0 flex-1', todo.tone === 'urgent' && 'font-medium')}
									>{todo.text}</span>
								<span class="text-beet flex shrink-0 items-center gap-1 text-xs"
									>{TAB_LABELS[todo.tab] ?? todo.tab} <ArrowRight class="size-3.5" /></span>
							</button>
						</li>
					{/each}
				</ul>
			</AdminPanel>
		{/if}

		<!-- The month in numbers -->
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
			<Stat
				size="sm"
				title="Posts by others"
				value={figures?.posts ?? 0}
				description={change('posts') ?? 'same as the month before'}
				loading={!summary}
				href="?tab=posts"
				onclick={(e) => (e.preventDefault(), openTab('posts'))} />
			<Stat size="sm" title="Views" value={compact(figures?.views)} description={change('views') ?? 'same as the month before'} loading={!summary} />
			<Stat size="sm" title="Creators" value={figures?.creators ?? 0} description={change('creators') ?? 'same as the month before'} loading={!summary} />
			<Stat
				size="sm"
				title="Reviews"
				value={figures?.reviews ?? 0}
				description={figures?.stars ? `${figures.stars.toFixed(2)} ★ average` : (change('reviews') ?? 'none stored')}
				loading={!summary}
				href="?tab=reviews"
				onclick={(e) => (e.preventDefault(), openTab('reviews'))} />
			<Stat
				size="sm"
				title="To answer"
				value={figures?.unanswered ?? 0}
				description="written, 3★ or fewer"
				tone={figures?.unanswered ? 'danger' : 'default'}
				loading={!summary}
				href="?tab=reviews&reviews=reply"
				onclick={(e) => (e.preventDefault(), openTab('reviews'))} />
			<Stat
				size="sm"
				title="Own posts"
				value={figures?.ownPosts ?? 0}
				description="its own accounts"
				loading={!summary} />
		</div>

		<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
			<div class="flex min-w-0 flex-col gap-5">
				<AdminPanel title="Six months" note={chain && cityId ? 'every branch in the city' : undefined}>
					{#if !summary}
						<SkeletonRows count={6} />
					{:else}
						<table class="w-full text-sm">
							<thead>
								<tr class="text-muted-foreground text-left text-xs">
									<th class="py-1.5 font-normal">Month</th>
									<th class="w-[38%] py-1.5 font-normal">Posts by others</th>
									<th class="py-1.5 text-right font-normal">Views</th>
									<th class="w-[28%] py-1.5 pl-4 font-normal">Reviews</th>
									<th class="py-1.5 text-right font-normal">Stars</th>
								</tr>
							</thead>
							<tbody class="divide-line divide-y">
								{#each [...summary.series].reverse() as row (row.month)}
									<tr class={row.month === month ? 'font-medium' : ''}>
										<td class="py-2 pr-3 whitespace-nowrap">{monthLabel(row.month)}</td>
										<td class="py-2">
											<div class="flex items-center gap-2">
												<span class="bg-wash h-2 flex-1 overflow-hidden rounded-full">
													<span
														class="bg-primary-darker block h-full rounded-full"
														style={`width: ${(row.posts / maxOf('posts')) * 100}%`}></span>
												</span>
												<span class="w-8 text-right tabular-nums">{row.posts}</span>
											</div>
										</td>
										<td class="py-2 text-right tabular-nums">{row.views ? compact(row.views) : '—'}</td>
										<td class="py-2 pl-4">
											<div class="flex items-center gap-2">
												<span class="bg-wash h-2 flex-1 overflow-hidden rounded-full">
													<span
														class="bg-beet block h-full rounded-full"
														style={`width: ${(row.reviews / maxOf('reviews')) * 100}%`}></span>
												</span>
												<span class="w-8 text-right tabular-nums">{row.reviews || '—'}</span>
											</div>
										</td>
										<td class="py-2 text-right tabular-nums">{row.stars ? row.stars.toFixed(1) : '—'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
						<p class="text-muted-foreground m-0 mt-3 text-xs">
							A month with no reviews was not scraped for this brand (reviews are scraped
							while it is a report brand or a competitor), not a month without reviews.
						</p>
					{/if}
				</AdminPanel>

				{#if summary?.reviewTags.length}
					<AdminPanel title="Google reviews often mention" note="all time">
						<p class="m-0 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
							{#each summary.reviewTags as tag (tag.title)}
								<span>{tag.title} <span class="text-muted-foreground text-xs tabular-nums">{tag.count}</span></span>
							{/each}
						</p>
						<p class="text-muted-foreground m-0 mt-2 text-xs">
							Google's own count over all of {chain ? 'its branches’' : 'its'} reviews: dishes guests come for, and what
							bothers them ("queue", "cash only").
						</p>
					</AdminPanel>
				{/if}

				<AdminPanel title="Most viewed posts" note={monthLabel(month)}>
					{#if !summary}
						<SkeletonRows count={3} />
					{:else if summary.topPosts.length === 0}
						<EmptyState
							title="No post by others named it"
							hint={`Nothing in ${monthLabel(month)}. Pick another month above.`}
							ground="none"
							size="sm" />
					{:else}
						<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
							{#each summary.topPosts as post (post.id)}
								<li>
									<a href={`/admin/posts/${post.id}`} class="hover:bg-sand flex gap-3 px-1 py-2.5">
										<span class="w-14 shrink-0 text-right font-medium tabular-nums">{compact(post.views)}</span>
										<span class="flex min-w-0 flex-1 flex-col gap-0.5">
											<span class="truncate">{post.summary}</span>
											<span class="text-muted-foreground truncate text-xs">
												@{post.author ?? '—'} · {PLATFORM_LABELS[post.platform] ?? post.platform} ·
												{onDay(post.postedAt)}{post.branch && chain ? ` · ${post.branch.name}` : ''}
											</span>
										</span>
										<Badge pill variant={sentimentVariant(post.sentiment)}>{post.sentiment}</Badge>
									</a>
								</li>
							{/each}
						</ul>
						{#if summary.brandOnlyPosts && chain}
							<p class="text-muted-foreground m-0 mt-3 text-xs">
								{summary.brandOnlyPosts} of the month's posts name the brand but no branch.
							</p>
						{/if}
					{/if}
				</AdminPanel>
			</div>

			<div class="flex min-w-0 flex-col gap-5">
				<AdminPanel title="Report">
					{#if !summary}
						<SkeletonRows count={2} />
					{:else if summary.report}
						<a href={`/admin/reports/${summary.report.id}`} class="group flex flex-col gap-1.5 text-sm">
							<span class="text-muted-foreground flex items-center gap-2 text-xs">
								<FileText class="size-3.5" />
								{monthLabel(summary.report.month)}{summary.report.month !== month ? ' (newest)' : ''} · built
								{ago(summary.report.updatedAt)}{summary.report.sentAt ? ` · sent ${onDay(summary.report.sentAt)}` : ' · not sent'}
							</span>
							{#if summary.report.title}<span class="font-semibold group-hover:underline">{summary.report.title}</span>{/if}
							{#if summary.report.headline}<span class="text-muted-foreground line-clamp-3">{summary.report.headline}</span>{/if}
						</a>
						{#if summary.report.month !== month}
							<div class="mt-3">
								<Button size="sm" variant="outline" icon={FileText} loading={building} onclick={onBuild}>
									Build {monthLabel(month)}
								</Button>
							</div>
						{/if}
					{:else}
						<div class="flex flex-col items-start gap-3">
							<p class="text-muted-foreground m-0 text-sm">No report yet.</p>
							<Button size="sm" variant="outline" icon={FileText} loading={building} onclick={onBuild}>
								Build {monthLabel(month)}
							</Button>
						</div>
					{/if}
				</AdminPanel>

				<AdminPanel title="Sales">
					{#if sales.prospect}
						<button type="button" class="flex w-full cursor-pointer flex-col gap-2 text-left text-sm" onclick={() => openTab('sales')}>
							<span class="flex items-center gap-2">
								<Badge pill variant={prospectStageVariant(sales.prospect.stage)}>{stageLabel(sales.prospect.stage)}</Badge>
								<span class="text-muted-foreground">
									{sales.prospect.outreachCount}
									{sales.prospect.outreachCount === 1 ? 'try' : 'tries'}{sales.prospect.lastTouchAt ? ` · last ${ago(sales.prospect.lastTouchAt)}` : ''}
								</span>
							</span>
							{#if sales.prospect.nextFollowUpAt}
								<span class={isDueToday(sales.prospect.nextFollowUpAt) ? 'text-destructive font-medium' : 'text-muted-foreground'}>
									Follow up {onDay(sales.prospect.nextFollowUpAt)}
								</span>
							{/if}
							{#if sales.prospect.hook}<span class="text-muted-foreground line-clamp-2 text-xs">Lead with: {sales.prospect.hook}</span>{/if}
						</button>
					{:else if sales.prospect === null}
						<div class="flex flex-col items-start gap-3">
							<p class="text-muted-foreground m-0 text-sm">
								Not on the sales list{brand.leadScore != null ? `; lead score ${Math.round(brand.leadScore)}` : ''}.
							</p>
							<Button size="sm" variant="outline" icon={Send} loading={sales.addAction.executing} onclick={async () => (await sales.addAction.execute()) && openTab('sales')}>
								Add to sales
							</Button>
						</div>
					{:else}
						<SkeletonRows count={2} />
					{/if}
				</AdminPanel>

				<BrandAccounts
					brandId={brand.id}
					{month}
					branches={chain
						? brand.branches.map((b) => ({ id: b.id, name: b.name, street: b.street ?? undefined }))
						: []} />

				<AdminPanel title={chain ? 'Branches' : 'Place'} note={chain ? brand.branches.filter((b) => !b.closed).length : undefined}>
					{#if chain}
						<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
							{#each brand.branches.filter((b) => !b.closed && (!cityId || b.city.id === cityId)).slice(0, 6) as branch (branch.id)}
								<li>
									<a href={`/admin/venues/${branch.id}`} class="hover:bg-sand flex items-center gap-3 px-1 py-2">
										<span class="flex min-w-0 flex-1 flex-col">
											<span class="truncate">{branch.name}</span>
											<span class="text-muted-foreground truncate text-xs">{[branch.district, branch.street].filter(Boolean).join(' · ')}</span>
										</span>
										<span class="text-muted-foreground shrink-0 text-xs tabular-nums">
											{branch.rating ? `${branch.rating.toFixed(1)} ★ · ` : ''}{branch.mentions} mentions
										</span>
									</a>
								</li>
							{/each}
						</ul>
						<button type="button" class="text-beet mt-2 cursor-pointer text-xs hover:underline" onclick={() => openTab('branches')}>
							All branches and branch tools
						</button>
					{:else if place}
						<a href={`/admin/venues/${place.id}`} class="flex flex-col gap-1 text-sm hover:underline">
							<span class="font-medium">{place.name}</span>
							<span class="text-muted-foreground text-xs">
								{[place.category, place.street, place.district].filter(Boolean).join(' · ')}
							</span>
							{#if place.rating}
								<span class="text-muted-foreground text-xs">{place.rating.toFixed(1)} ★ · {place.reviewsCount ?? 0} Google reviews</span>
							{/if}
						</a>
						<p class="text-muted-foreground m-0 mt-2 text-xs">
							Google details, food topics, demand and search ranks are on the place's page.
						</p>
					{/if}
				</AdminPanel>
			</div>
		</div>
	</div>
{/if}
