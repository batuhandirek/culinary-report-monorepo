<script lang="ts">
	import { ExternalLink, Map as MapIcon, MapPin } from '@lucide/svelte';
	import type {
		AdminBrandMonthFiguresOutputDto,
		AdminBrandOutputDto,
		AdminBrandSummaryOutputDto,
		AdminBrandTopPostOutputDto,
		AdminMentionOutputDto
	} from 'client';

	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import Pill from '#components/admin/detail/Pill.svelte';
	import StatCell from '#components/admin/detail/StatCell.svelte';
	import TagCloud from '#components/admin/detail/TagCloud.svelte';
	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import { postColumns } from '#components/admin/posts/post-columns.js';
	import RatingChart from '#components/admin/RatingChart.svelte';
	import ChangeMentionVenueDialog from '#dialogs/admin/ChangeMentionVenueDialog.svelte';
	import { compact, monthLabel } from '#lib/culinary.js';
	import { topicHref } from '#lib/topic-format.js';
	import type { Column, PaginatedDataTableAction } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { cn } from '#ui/lib/utils.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The brand at a glance: what needs doing, a window (the last 30 days by default) against the
	// one before it with each figure's twelve months as bars under it, its Google rating over time,
	// the window's most viewed posts, its places and what its reviews mention (its own accounts are a header key). Every count opens the tab that lists it.
	interface Props {
		brand: AdminBrandOutputDto;
		cityId?: string;
		/** Loaded by the page (its tabs count from it); null while loading */
		summary: AdminBrandSummaryOutputDto | null;
		period: string;
		onPeriod: (period: string) => void;
		failed: boolean;
		onRetry: () => void;
		openTab: (tab: string, params?: Record<string, string>) => void;
	}

	let { brand, cityId, summary, period, onPeriod, failed, onRetry, openTab }: Props = $props();

	const chain = $derived(brand.branches.length > 1);
	const places = $derived(
		brand.branches
			.filter((b) => !b.closed && (!cityId || b.city.id === cityId))
			.sort((a, b) => (b.reviewsCount ?? -1) - (a.reviewsCount ?? -1))
	);
	const figures = $derived(summary?.figures);

	const PERIODS = [
		{ value: '30d', label: '30d', long: '30 days' },
		{ value: '90d', label: '90d', long: '90 days' },
		{ value: '12mo', label: '12 mo', long: '12 months' }
	];
	const windowLabel = $derived(PERIODS.find((p) => p.value === period)?.long ?? '30 days');

	// "+30": the change on the window before, signed; nothing when equal or unknown
	const change = (key: keyof AdminBrandMonthFiguresOutputDto) => {
		const now = summary?.figures[key];
		const then = summary?.previous[key];
		if (typeof now !== 'number' || typeof then !== 'number' || now === then) return {};
		const diff = now - then;
		const shown = key === 'views' ? compact(Math.abs(diff)) : Math.abs(diff).toLocaleString('en');
		return { delta: `${diff > 0 ? '+' : '−'}${shown}`, tone: diff > 0 ? ('up' as const) : ('down' as const) };
	};

	const TONE_DOT = { urgent: 'bg-destructive', todo: 'bg-[hsl(40_100%_30%)]', info: 'bg-faint' } as const;
	const TAB_LABELS: Record<string, string> = {
		posts: 'Posts',
		reviews: 'Reviews',
		places: 'Places',
		competitors: 'Competitors',
		signals: 'Signals',
		history: 'History',
		settings: 'Settings',
		overview: 'Overview'
	};
	// A to-do opening with its number shows the number in bold
	const leading = (text: string) => text.match(/^([\d,.]+)(\s.*)$/);

	// A figure's twelve months, as the bars under it; a month without reviews was not scraped
	const trend = (key: 'posts' | 'views' | 'creators' | 'reviews' | 'ownPosts', noun: string) =>
		summary?.series.map((s) => ({
			value: s[key] ?? 0,
			text: `${monthLabel(s.month)}: ${
				key === 'reviews' && !s.reviews
					? 'none stored (not scraped)'
					: `${key === 'views' ? compact(s.views) : (s[key] ?? 0).toLocaleString('en')} ${noun}${key === 'reviews' && s.stars ? `, ${s.stars.toFixed(1)} ★` : ''}`
			}`
		}));

	// The most viewed posts as every post table shows them (`post-columns.ts`), with the tone
	// worked out from their claims about the brand and, on a chain, the branch they named
	type TopPost = AdminBrandTopPostOutputDto;
	const topPostsPage = async () => {
		const items = summary?.topPosts ?? [];
		return { items, page: 1, pageSize: Math.max(items.length, 1), totalItems: items.length };
	};
	const TOP_POST_COLUMNS: Column<TopPost>[] = $derived(
		postColumns<TopPost>(
			(post) => ({
				postId: post.id,
				postedAt: post.postedAt,
				platform: post.platform,
				author: post.author,
				text: post.summary,
				views: post.views,
				tone: post.sentiment
			}),
			{
				text: 'What they said',
				empty: 'says nothing we kept',
				afterCreator: chain
					? [{ type: 'value', name: 'Branch', class: 'max-w-[10rem]', truncate: 18, value: (post) => post.branch?.name ?? { value: 'the brand', class: 'text-muted-foreground' } }]
					: []
			}
		)
	);
	const TOP_POST_ACTIONS: PaginatedDataTableAction<TopPost>[] = $derived([
		{ icon: ExternalLink, label: 'Open on its platform', href: (post) => post.url },
		...(chain
			? [
					{
						icon: MapPin,
						label: 'Assign a branch',
						if: (post: TopPost) => !post.branch,
						onClick: (post: TopPost) => {
							moving = post;
							moveOpen = true;
						}
					}
				]
			: [])
	]);

	// "Assign branch" on a post that named only the brand: the mention is moved to one branch
	let moving = $state<AdminBrandTopPostOutputDto | null>(null);
	let moveOpen = $state(false);
	const movedMention = $derived(
		moving
			? ({ id: moving.mentionId, venueName: brand.name, locationHint: undefined, venue: undefined, matchNote: undefined } as unknown as AdminMentionOutputDto)
			: null
	);
</script>

{#snippet topPostDetails(post: AdminBrandTopPostOutputDto)}
	<DigestionDetail postId={post.id} />
{/snippet}

{#if failed}
	<ErrorState title="Couldn't load the brand's figures" {onRetry} />
{:else}
	<div class="flex min-w-0 flex-col gap-3">
		<!-- What needs doing: each line opens the tab where it is done -->
		{#if summary?.todos.length}
			<section class="border-destructive/25 bg-destructive/[0.04] flex flex-wrap rounded-md border" aria-label="What needs doing">
				{#each summary.todos as todo (todo.key)}
					{@const number = leading(todo.text)}
					<div class="border-destructive/15 flex min-w-0 flex-[1_1_300px] items-center gap-2 border-r px-3.5 py-2 text-[12.5px] last:border-r-0">
						<span class={cn('size-2 shrink-0 rounded-full', TONE_DOT[todo.tone])}></span>
						<span class="min-w-0 flex-1 truncate" title={todo.text}>
							{#if number}<b>{number[1]}</b>{number[2]}{:else}{todo.text}{/if}
						</span>
						<a
							href={`?tab=${todo.tab}`}
							class="shrink-0"
							onclick={(e) => (e.preventDefault(), openTab(todo.tab))}>{TAB_LABELS[todo.tab] ?? todo.tab} →</a>
					</div>
				{/each}
			</section>
		{/if}

		<div class="-mb-1 flex items-center justify-between gap-2">
			<span class="eyebrow text-muted-foreground text-[7.5px]"
				>Last {windowLabel} · vs the {windowLabel.split(' ')[0]} before</span>
			<span class="border-line inline-flex overflow-hidden rounded-lg border" role="group" aria-label="Period">
				{#each PERIODS as p (p.value)}
					<button
						type="button"
						aria-pressed={p.value === period}
						class={cn(
							'cursor-pointer px-[9px] py-[3px] text-xs font-medium',
							p.value === period ? 'bg-ink text-sand' : 'text-muted-foreground hover:text-ink'
						)}
						onclick={() => onPeriod(p.value)}>{p.label}</button>
				{/each}
			</span>
		</div>

		<section class="bg-paper border-line flex flex-wrap rounded-md border" aria-label={`The last ${windowLabel} in figures`}>
			<StatCell
				label="Posts by others"
				value={figures?.posts ?? 0}
				{...change('posts')}
				sub={`by ${figures?.creators ?? 0} creators`}
				trend={trend('posts', 'posts')}
				loading={!summary}
				href="?tab=posts"
				onclick={(e) => (e.preventDefault(), openTab('posts'))} />
			<StatCell label="Views" value={compact(figures?.views)} {...change('views')} sub="on posts by others" trend={trend('views', 'views')} loading={!summary} />
			<StatCell label="Creators" value={figures?.creators ?? 0} {...change('creators')} sub="who named it" trend={trend('creators', 'creators')} loading={!summary} />
			<StatCell
				label="Reviews"
				value={(figures?.reviews ?? 0).toLocaleString('en')}
				sub={figures?.stars ? `${figures.stars.toFixed(2)} ★ average` : 'none stored'}
				trend={trend('reviews', 'reviews')}
				loading={!summary}
				href="?tab=reviews"
				onclick={(e) => (e.preventDefault(), openTab('reviews'))} />
			<StatCell
				label="To answer"
				value={figures?.unanswered ?? 0}
				bad={!!figures?.unanswered}
				sub="3★ or fewer, unanswered"
				loading={!summary}
				href="?tab=reviews&reply=1"
				onclick={(e) => (e.preventDefault(), openTab('reviews', { reply: '1' }))} />
			<StatCell label="Own posts" value={figures?.ownPosts ?? 0} sub="its own accounts" trend={trend('ownPosts', 'own posts')} loading={!summary} />
		</section>

		<div class="flex flex-wrap items-start gap-3">
			<div class="flex min-w-0 flex-[999_1_620px] flex-col gap-3">
				<DetailCard title="Google rating" note={chain ? 'over its open places' : 'as each read saw it'}>
					{#snippet aside()}
						<a href="?tab=reviews" onclick={(e) => (e.preventDefault(), openTab('reviews'))}>Reviews →</a>
					{/snippet}
					{#if !summary}
						<div class="pb-3"><SkeletonRows count={3} /></div>
					{:else if summary.ratings.length}
						<div class="pb-2.5"><RatingChart points={summary.ratings} /></div>
					{:else}
						<p class="text-muted-foreground m-0 pb-3 text-xs">No Google rating read yet.</p>
					{/if}
				</DetailCard>

				<DetailCard title="Most viewed posts" note={windowLabel} flush>
					{#snippet aside()}
						{#if chain && summary?.brandOnlyPosts}
							<span class="text-muted-foreground">{summary.brandOnlyPosts} name no branch ·</span>
						{/if}
						<a href="?tab=posts" onclick={(e) => (e.preventDefault(), openTab('posts'))}
							>All {summary ? summary.figures.posts + summary.figures.ownPosts : ''} posts</a>
					{/snippet}
					{#if !summary}
						<div class="px-3.5 pb-3"><SkeletonRows count={4} /></div>
					{:else if summary.topPosts.length === 0}
						<p class="text-muted-foreground border-line m-0 border-t px-3.5 py-3 text-xs">
							No post by others named it in the last {windowLabel}.
						</p>
					{:else}
						<PaginatedDataTable
							bare
							dense
							api={topPostsPage}
							key={period}
							noun="posts"
							columns={TOP_POST_COLUMNS}
							actions={TOP_POST_ACTIONS}
							expand={topPostDetails}
							rowKey={(post) => post.id} />
					{/if}
				</DetailCard>
			</div>

			<div class="flex min-w-0 max-w-[420px] flex-[1_1_340px] flex-col gap-3 max-lg:max-w-none">
				<DetailCard title={chain ? 'Places' : 'Place'} note={chain ? places.length : undefined} flush>
					{#snippet aside()}
						<a href="?tab=places" onclick={(e) => (e.preventDefault(), openTab('places'))}>Branch tools</a>
					{/snippet}
					{#if places.length === 0}
						<p class="text-muted-foreground m-0 px-3.5 pb-3 text-xs">No open place in this city.</p>
					{:else}
						<table class="mb-1.5 w-full border-collapse text-xs tabular-nums">
							<tbody>
								{#each places as branch (branch.id)}
									<tr class="group hover:bg-sand/60 [&:not(:last-child)>td]:border-line/60 [&:not(:last-child)>td]:border-b">
										<td class="w-full max-w-0 truncate py-[5px] pr-3.5 pl-3.5">
											<a href={`/admin/venues/${branch.id}`}>{chain ? (branch.street ?? branch.name) : branch.name}</a>
											{#if branch.district}<Pill class="ml-1 h-[18px] text-[11px]">{branch.district}</Pill>{/if}
										</td>
										<td class="py-[5px] pr-3.5 text-right whitespace-nowrap">{branch.rating ? `${branch.rating.toFixed(1)}★` : '—'}</td>
										<td class="text-muted-foreground py-[5px] pr-3.5 text-right whitespace-nowrap">{branch.mentions} posts</td>
										<td class="w-8 pr-2">
											{#if branch.googleUrl}
												<span class="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
													<IconButton icon={MapIcon} label="Google Maps" variant="ghost" xs href={branch.googleUrl} target="_blank" rel="noreferrer" />
												</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</DetailCard>

				{#if summary?.reviewTags.length}
					<DetailCard title="Reviews mention" note={chain ? 'all time, all branches' : 'all time'}>
						<TagCloud
							tags={summary.reviewTags.map((t) => ({
								title: t.title,
								count: t.count,
								...(t.topic && { href: topicHref(t.topic.key), hint: `Food topic: ${t.topic.label}` })
							}))} />
					</DetailCard>
				{/if}
			</div>
		</div>
	</div>

	{#if movedMention}
		<ChangeMentionVenueDialog mention={movedMention} bind:active={moveOpen} onChanged={onRetry} />
	{/if}
{/if}
