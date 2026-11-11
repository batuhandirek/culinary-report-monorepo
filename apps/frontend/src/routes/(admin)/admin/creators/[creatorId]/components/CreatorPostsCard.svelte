<script lang="ts">
	import { ArrowDownWideNarrow, CalendarArrowDown, ExternalLink, RefreshCw } from '@lucide/svelte';

	import { type AdminSocialPostListItemOutputDto, ListPostsParamsSortEnum as SortBy } from 'client';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import DigestionDetail from '#components/admin/digestion/DigestionDetail.svelte';
	import { postColumns } from '#components/admin/posts/post-columns.js';
	import PostBrandsCell from '#components/admin/posts/PostBrandsCell.svelte';
	import { api } from '#lib/api.js';
	import { tallyOf } from '#lib/statements.js';
	import { followWorkflow } from '#lib/workflow-follow.js';
	import { workflowHref } from '#lib/workflow-status.js';
	import type { Column, PaginatedDataTableAction } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import { cn } from '#ui/lib/utils.js';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// Every post of theirs we stored, as every post table shows one (`post-columns.ts`) without the
	// creator column (it is one person), with the brands each names. The card's head narrows it: the
	// posts naming a brand, the last 30 or 90 days (`?period=`), newest or most viewed first
	// (`?sort=views`). A row opens in place on the post; on hover it opens on its platform or is
	// read again ("Re-analyse": the gate and agent A, a few agent calls).
	interface Props {
		creatorId: string;
		/** Every post we stored of theirs */
		total: number;
		/** After a re-read: the header's figures may have moved */
		onChanged?: () => void;
	}

	let { creatorId, total, onChanged }: Props = $props();

	const param = (name: string) => page.url.searchParams.get(name) ?? undefined;
	const PERIODS = [
		{ value: '30d', label: '30d', days: 30 },
		{ value: '90d', label: '90d', days: 90 },
		{ value: 'all', label: 'All' }
	];
	const period = $derived(PERIODS.find((p) => p.value === param('period')) ?? PERIODS[2]);
	const namesBrand = $derived(param('posts') === 'brands');
	const byViews = $derived(param('sort') === 'views');
	const setParam = (name: string, value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
		goto(url, { replace: true, reset: false });
	};

	const isoDay = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
	const from = $derived(period.days ? isoDay(period.days) : undefined);

	// How many of the period's posts name a brand, for the switch
	let named = $state<number | null>(null);
	let version = $state(0);
	$effect(() => {
		const query = { creatorId, matchedOnly: true, page: 1, size: 1, ...(from && { from }) };
		void version;
		api.admin.listPosts(query).then((res) => (named = res.totalItems));
	});

	type Row = AdminSocialPostListItemOutputDto;
	const statusOf = (row: Row) => (row.skipReason ? 'skipped' : row.analysedAt ? 'digested' : 'unread');
	const COLUMNS: Column<Row>[] = postColumns<Row>(
		(row) => ({
			postId: row.id,
			postedAt: row.postedAt,
			platform: row.platform,
			author: row.author ?? undefined,
			text: row.text ?? undefined,
			views: row.views,
			status: statusOf(row),
			skipReason: row.skipReason ?? undefined,
			sentiments: tallyOf(row.mentions.flatMap((m) => m.statements ?? []))
		}),
		{
			creator: false,
			afterText: [
				{
					type: 'component',
					name: 'Brand',
					component: PostBrandsCell,
					props: (row) => ({ mentions: row.mentions })
				}
			]
		}
	);

	// "Re-analyse": followed for two minutes, the table read again when it ends
	const reread = async (row: Row) => {
		try {
			const { workflowId } = await api.admin.rereadPost(row.id);
			const openRun = { label: 'Open run', onClick: () => goto(workflowHref(workflowId)) };
			notificationManager.addNotification({ title: 'Reading it again', text: row.text?.slice(0, 80), info: true, action: openRun });
			const run = await followWorkflow(workflowId, 2 * 60_000);
			if (run.status === 'done') {
				version++;
				onChanged?.();
				notificationManager.addNotification({ title: 'Read again', text: row.text?.slice(0, 80), success: true, action: openRun });
			} else if (run.status === 'failed') {
				notificationManager.addNotification({ title: "The re-read failed", text: run.error, error: true, time: 20_000, action: openRun });
			} else {
				notificationManager.addNotification({ title: 'Still reading after two minutes', text: 'It goes on by itself on Workflows', info: true, action: openRun });
			}
		} catch {
			notificationManager.addNotification({ title: "Couldn't start the re-read", error: true });
		}
	};

	const HOVER = 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100';
	const ACTIONS: PaginatedDataTableAction<Row>[] = [
		{ icon: ExternalLink, label: 'Open on its platform', href: (row) => row.url, class: HOVER },
		{ icon: RefreshCw, label: 'Re-analyse', onClick: reread, class: HOVER }
	];

	const listPosts = (query: { page: number; size: number }) =>
		api.admin.listPosts({
			page: query.page,
			size: query.size,
			creatorId,
			sort: byViews ? SortBy.ViewsDesc : SortBy.PostedAtDesc,
			...(namesBrand && { matchedOnly: true }),
			...(from && { from })
		});
</script>

{#snippet seg(options: { value: string; label: string }[], value: string, onPick: (value: string) => void, label: string)}
	<span class="border-line inline-flex overflow-hidden rounded-lg border" role="group" aria-label={label}>
		{#each options as o (o.value)}
			<button
				type="button"
				aria-pressed={o.value === value}
				class={cn(
					'cursor-pointer px-[9px] py-[3px] text-xs font-medium whitespace-nowrap',
					o.value === value ? 'bg-ink text-sand' : 'text-muted-foreground hover:text-ink'
				)}
				onclick={() => onPick(o.value)}>{o.label}</button>
		{/each}
	</span>
{/snippet}

{#snippet details(row: Row)}
	<DigestionDetail postId={row.id} />
{/snippet}

<DetailCard title="Posts" note={total} flush class="min-w-0 flex-[999_1_600px]">
	{#snippet aside()}
		{@render seg(
			[
				{ value: 'all', label: 'All' },
				{ value: 'brands', label: `Names a brand${named !== null ? ` ${named}` : ''}` }
			],
			namesBrand ? 'brands' : 'all',
			(v) => setParam('posts', v === 'brands' ? v : undefined),
			'Which posts'
		)}
		{@render seg(PERIODS, period.value, (v) => setParam('period', v === 'all' ? undefined : v), 'Period')}
		<Tooltip text={byViews ? 'Most viewed first' : 'Newest first'}>
			<button
				type="button"
				aria-label={byViews ? 'Sort: most viewed first' : 'Sort: newest first'}
				class="text-muted-foreground hover:bg-wash hover:text-ink grid size-6 cursor-pointer place-items-center rounded-md"
				onclick={() => setParam('sort', byViews ? undefined : 'views')}>
				{#if byViews}<ArrowDownWideNarrow class="size-3.5" />{:else}<CalendarArrowDown class="size-3.5" />{/if}
			</button>
		</Tooltip>
	{/snippet}
	<PaginatedDataTable
		bare
		api={listPosts}
		noun="posts"
		columns={COLUMNS}
		actions={ACTIONS}
		key={`${version}:${period.value}:${namesBrand}:${byViews}`}
		limit={10}
		fill={false}
		expand={details}
		rowKey={(row) => row.id}
		emptyDescription={namesBrand
			? 'None of these posts names a brand we know.'
			: period.days
				? `No post of theirs in the last ${period.days} days.`
				: 'No post of theirs stored yet.'} />
</DetailCard>
