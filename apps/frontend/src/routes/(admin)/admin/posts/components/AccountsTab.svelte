<script lang="ts">
	import { Check, RefreshCw, Unlink, X } from '@lucide/svelte';

	import {
		type AdminAccountOutputDto,
		type AdminListAccountsOutputDto,
		type DecideAccountPayload,
		ListAccountsParamsPlatformEnum as Platform,
		ListAccountsParamsSortEnum as SortBy,
		ListAccountsParamsStatusEnum as Status
	} from 'client';

	import AccountBrandCell from './AccountBrandCell.svelte';
	import AccountCell from './AccountCell.svelte';

	import { followersText } from '#lib/accounts.js';
	import { api } from '#lib/api.js';
	import { compact, currentMonth, monthLabel } from '#lib/culinary.js';
	import type {
		Column,
		Filter,
		PaginatedDataTableAction,
		Sort
	} from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';

	// The Social page's "Own accounts" and "To review" tabs: the venues' own TikTok and
	// Instagram accounts, or the handles that look like a venue's. The matcher links the obvious
	// ones after every mention matching (a handle that is the name, a branch's Google website);
	// a likely one waits for review. "Not theirs" is final.
	interface Props {
		status: Status;
		cityId?: string;
		month: string;
		/** Each status's count, from every page fetched */
		onCounts?: (counts: AdminListAccountsOutputDto['counts']) => void;
	}

	let { status, cityId, month, onCounts }: Props = $props();

	const listAccounts = async (params: Parameters<typeof api.admin.listAccounts>[0]) => {
		const result = await api.admin.listAccounts(params);
		onCounts?.(result.counts);
		return result;
	};

	// Changing it refetches the page in view, after a decision
	let refresh = $state(0);

	const matchAction = createAction(() => api.admin.matchAccounts({ cityId: cityId! }), {
		onSuccess: () => refresh++,
		successNotification: (result) => ({
			title: 'Accounts matched',
			text: `${result.linked} linked by name, ${result.websites + result.fromSites} from websites, ${result.fromTags} new from creators' tags, ${result.suggested + result.siteSuggested} to review`
		})
	});

	const decideAction = createAction(
		(account: AdminAccountOutputDto, decision: DecideAccountPayload) =>
			api.admin.decideAccount(account.id, decision),
		{
			onSuccess: () => refresh++,
			successNotification: (_, [account, decision]) => {
				const brand = account.brand ?? account.suggestedBrand;
				return decision.action === 'reject'
					? {
							title: `Not ${brand?.name ?? 'theirs'}`,
							text: `@${account.handle} won't be matched to it again`,
							...(brand && {
								action: {
									label: 'Undo',
									onClick: () =>
										decideAction.execute(account, {
											action: 'link',
											brandId: brand.id,
											branchId: account.branch?.id
										} as DecideAccountPayload)
								}
							})
						}
					: { title: `@${account.handle} is ${brand?.name ?? 'theirs'}` };
			}
		}
	);

	const ACTIONS: PaginatedDataTableAction<AdminAccountOutputDto>[] = [
		{
			icon: Check,
			label: 'Confirm: it is theirs',
			if: (row) => !row.brand && !!row.suggestedBrand,
			onClick: (row) => void decideAction.execute(row, { action: 'confirm' } as DecideAccountPayload)
		},
		{
			icon: X,
			label: 'Not theirs',
			if: (row) => !row.brand && !!row.suggestedBrand,
			onClick: (row) => void decideAction.execute(row, { action: 'reject' } as DecideAccountPayload)
		},
		{
			icon: Unlink,
			label: 'Not their account',
			if: (row) => !!row.brand,
			onClick: (row) => void decideAction.execute(row, { action: 'reject' } as DecideAccountPayload)
		}
	];

	const SORTS: Sort[] = [
		{ value: SortBy.FollowersDesc, name: 'Most followers' },
		{ value: SortBy.MonthPostsDesc, name: 'Most posts this month' },
		{ value: SortBy.MonthViewsDesc, name: 'Most views this month' },
		{ value: SortBy.ScoreDesc, name: 'Closest match' },
		{ value: SortBy.HandleAsc, name: 'Handle A–Z' }
	];
	const FILTERS: Filter[] = [
		{ key: 'q', name: 'Search', type: 'text', placeholder: 'Handle, name or brand…' },
		{
			key: 'platform',
			name: 'Platform',
			type: 'select',
			options: [
				{ name: 'TikTok', value: Platform.Tiktok },
				{ name: 'Instagram', value: Platform.Instagram }
			]
		}
	];
	const filters = $derived({
		sort: status === Status.Suggested ? SortBy.ScoreDesc : SortBy.FollowersDesc,
		status,
		month,
		...(cityId && { cityId }),
		q: undefined
	});

	const COLUMNS: Column<AdminAccountOutputDto>[] = $derived([
		{
			type: 'component',
			name: 'Account',
			component: AccountCell,
			props: (row) => ({ account: row }),
			sort: { asc: SortBy.HandleAsc, desc: SortBy.HandleDesc }
		},
		{
			type: 'component',
			name: 'Brand',
			label: status === Status.Suggested ? 'Looks like' : 'Brand',
			component: AccountBrandCell,
			props: (row) => ({ account: row }),
			sort: status === Status.Suggested ? { asc: SortBy.ScoreAsc, desc: SortBy.ScoreDesc } : undefined
		},
		{
			type: 'value',
			name: 'Followers',
			numeric: true,
			value: (row) => {
				const text = followersText(row);
				return text === '—' ? { value: text, class: 'text-faint' } : text;
			},
			sort: { asc: SortBy.FollowersAsc, desc: SortBy.FollowersDesc }
		},
		{
			type: 'value',
			name: 'Posts',
			label: 'Posts we saw',
			numeric: true,
			value: (row) => (row.stats.monthPosts ? row.stats.monthPosts : { value: '—', class: 'text-faint' }),
			sort: { asc: SortBy.MonthPostsAsc, desc: SortBy.MonthPostsDesc }
		},
		{
			type: 'value',
			name: 'Views',
			numeric: true,
			value: (row) => (row.stats.monthViews ? compact(row.stats.monthViews) : { value: '—', class: 'text-faint' }),
			sort: { asc: SortBy.MonthViewsAsc, desc: SortBy.MonthViewsDesc }
		},
		{
			type: 'value',
			name: 'Per post',
			label: 'Views per post',
			numeric: true,
			value: (row) =>
				row.latest?.avgViews !== undefined
					? compact(row.latest.avgViews)
					: { value: '—', class: 'text-faint' }
		},
		{ type: 'date', name: 'Last post', format: 'date', value: (row) => row.stats.lastPostedAt },
		{ type: 'date', name: 'Seen', label: 'Figures seen', format: 'date', value: (row) => row.latest?.scrapedAt }
	]);
</script>

{#if status === Status.Suggested}
	<p class="ink-strip m-0 text-sm">
		Handles close to a venue's name that the matcher won't link alone. Confirm the ones that
		are the venue's; "Not theirs" is final, and its posts count as word of mouth.
	</p>
{:else}
	<p class="text-muted-foreground m-0 text-sm">
		Posts by these accounts are the venue talking, never word of mouth. Followers and views
		per post come from the monthly profile scrape (the report brands); the rest from the
		posts we stored in {monthLabel(month)}{month === currentMonth() ? ' so far' : ''}.
	</p>
{/if}
<PaginatedDataTable
	key={refresh}
	syncWithSearchParams
	{filters}
	api={listAccounts}
	noun="accounts"
	availableFilters={FILTERS}
	availableSorts={SORTS}
	columns={COLUMNS}
	actions={ACTIONS}
	limit={50}
	emptyDescription={status === Status.Suggested
		? 'Nothing to review: every handle close to a venue name is linked or ruled out.'
		: 'No venue accounts yet. Run "Match now", or add one on a brand page.'}
	rowHref={(row) => `/admin/creators/${row.creator.id}`}>
	{#snippet toolbar()}
		<Button
			size="sm"
			variant="outline"
			icon={RefreshCw}
			loading={matchAction.executing}
			disabled={!cityId}
			onclick={() => matchAction.execute()}>Match now</Button>
	{/snippet}
</PaginatedDataTable>
