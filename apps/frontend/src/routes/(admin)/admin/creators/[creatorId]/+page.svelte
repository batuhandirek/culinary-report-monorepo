<script lang="ts">
	import {
		type AdminCreatorOutputDto,
		type AdminSocialPostListItemOutputDto,
		ListPostsParamsSortEnum
	} from 'client';

	import CreatorAccountsPanel from './components/CreatorAccountsPanel.svelte';

	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onDay } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { compact, lastMonth, monthLabel, PLATFORM_LABELS, recentMonths } from '#lib/culinary.js';
	import type { Column, Sort } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// One person behind one or more accounts: their accounts and whose they are, six months of
	// posts, the brands they named, and every post we stored of theirs.
	let { data } = $props();
	let creator: AdminCreatorOutputDto = $derived(data.creator);

	const month = $derived(page.url.searchParams.get('month') ?? lastMonth());
	const MONTHS = recentMonths(12).map((m) => ({ value: m, label: monthLabel(m) }));
	const setMonth = (value: string | undefined) => {
		const url = new URL(page.url.href);
		if (value && value !== lastMonth()) url.searchParams.set('month', value);
		else url.searchParams.delete('month');
		goto(url, { replace: true });
	};

	const own = $derived(creator.accounts.length > 0 && creator.accounts.every((a) => a.brand));
	const followers = $derived(
		Math.max(...creator.accounts.map((a) => a.latest?.followers ?? a.followers ?? -1))
	);
	const busiest = $derived(Math.max(1, ...creator.months.map((m) => m.posts)));

	// The name field, reset to the creator's whenever it changes
	let name = $derived(creator.name);
	const renameAction = createAction((value: string) => api.admin.updateCreator(creator.id, { name: value }), {
		onSuccess: () => invalidateAll(),
		successNotification: (result) => ({ title: 'Renamed', text: result.name })
	});

	const SORTS: Sort[] = [
		{ value: ListPostsParamsSortEnum.PostedAtDesc, name: 'Newest first' },
		{ value: ListPostsParamsSortEnum.ViewsDesc, name: 'Most viewed' }
	];
	const POST_COLUMNS: Column<AdminSocialPostListItemOutputDto>[] = [
		{ type: 'date', name: 'Posted', format: 'date', value: (row) => row.postedAt },
		{
			type: 'value',
			name: 'Account',
			value: (row) => `${PLATFORM_LABELS[row.platform]} @${row.author ?? ''}`
		},
		{ type: 'value', name: 'Caption', truncate: 60, value: (row) => row.text ?? '' },
		{
			type: 'value',
			name: 'Names',
			label: 'Brands named',
			truncate: 40,
			value: (row) =>
				[...new Set(row.mentions.map((m) => m.brand?.name).filter(Boolean))].join(', ') || {
					value: '—',
					class: 'text-faint'
				}
		},
		{ type: 'value', name: 'Views', numeric: true, value: (row) => compact(row.views) }
	];
</script>

<AdminPageHeader title={creator.name}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">Creator · first seen {onDay(creator.createdAt)}</span>
	{/snippet}
	{#snippet belowTitle()}
		<div class="mt-1.5 flex flex-wrap items-center gap-2">
			{#if own}
				<Badge pill variant="secondary">A venue's own accounts</Badge>
			{/if}
			{#if followers >= 0}
				<Badge pill variant="secondary">{compact(followers)} followers</Badge>
			{/if}
			<Badge pill variant="secondary">{creator.posts} posts · {compact(creator.views)} views stored</Badge>
		</div>
	{/snippet}
	{#snippet rightTitle()}
		<div class="w-44">
			<Select items={MONTHS} value={month} aria-label="Month" size="sm" onValueChange={setMonth} />
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
		<CreatorAccountsPanel {creator} {month} />

		<div class="flex min-w-0 flex-col gap-5">
			<AdminPanel title="Six months" note="posts we stored">
				<ul class="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
					{#each creator.months as m (m.month)}
						<li class="grid grid-cols-[8rem_minmax(0,1fr)_5rem] items-center gap-3">
							<span class={m.month === month ? 'font-semibold' : 'text-muted-foreground'}>{monthLabel(m.month)}</span>
							<span class="bg-wash h-2 overflow-hidden rounded-full">
								<span class="bg-primary-darker block h-full rounded-full" style={`width: ${(m.posts / busiest) * 100}%`}></span>
							</span>
							<span class="text-right tabular-nums">{m.posts ? `${m.posts} · ${compact(m.views)}` : '—'}</span>
						</li>
					{/each}
				</ul>
			</AdminPanel>

			<AdminPanel title="Brands they named" note={creator.brands.length || undefined}>
				{#if creator.brands.length}
					<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
						{#each creator.brands as brand (brand.id)}
							<li class="flex items-center gap-3 py-2">
								<a href={`/admin/brands/${brand.id}`} class="min-w-0 flex-1 truncate font-medium hover:underline">{brand.name}</a>
								{#if brand.own}<Badge variant="secondary">their own</Badge>{/if}
								<span class="text-muted-foreground shrink-0 text-xs tabular-nums">
									{brand.posts} {brand.posts === 1 ? 'post' : 'posts'} · {compact(brand.views)} views · last {onDay(brand.lastPostedAt)}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<EmptyState title="No brand named yet" hint="Their posts named no venue we know." ground="none" size="sm" />
				{/if}
			</AdminPanel>

			<AdminPanel title="Name">
				<form
					class="flex items-end gap-2"
					onsubmit={(e) => {
						e.preventDefault();
						if (name.trim() && name.trim() !== creator.name) renameAction.execute(name.trim());
					}}>
					<div class="min-w-40 flex-1"><Input bind:value={name} aria-label="Creator name" /></div>
					<Button type="submit" variant="outline" loading={renameAction.executing} disabled={!name.trim() || name.trim() === creator.name}
						>Rename</Button>
				</form>
			</AdminPanel>
		</div>
	</div>

	<AdminPanel title="Posts">
		<PaginatedDataTable
			filters={{ creatorId: creator.id, sort: ListPostsParamsSortEnum.PostedAtDesc }}
			api={api.admin.listPosts}
			noun="posts"
			availableSorts={SORTS}
			columns={POST_COLUMNS}
			fill={false}
			rowHref={(row) => `/admin/posts/${row.id}`} />
	</AdminPanel>
</div>
