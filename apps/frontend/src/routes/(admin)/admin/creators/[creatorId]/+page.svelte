<script lang="ts">
	import { Copy, Eye, EyeOff, Newspaper, Pencil, RefreshCw } from '@lucide/svelte';
	import type { AdminCreatorOutputDto } from 'client';

	import { untrack } from 'svelte';

	import { NOT_WATCHED_TIP, shortDay, watchPill } from './components/creator-text.js';
	import CreatorAccountsCard from './components/CreatorAccountsCard.svelte';
	import CreatorBrandsCard from './components/CreatorBrandsCard.svelte';
	import CreatorFoundCard from './components/CreatorFoundCard.svelte';
	import CreatorPostsCard from './components/CreatorPostsCard.svelte';
	import { CreatorWatchStore } from './stores/CreatorWatchStore.svelte.js';

	import { goto, invalidateAll } from '$app/navigation';
	import { onDay } from '#components/admin/admin-format.js';
	import DetailHead from '#components/admin/detail/DetailHead.svelte';
	import IconKey from '#components/admin/detail/IconKey.svelte';
	import Pill from '#components/admin/detail/Pill.svelte';
	import PlatformIcon, { PLATFORM_NAMES } from '#components/admin/detail/PlatformIcon.svelte';
	import StatCell from '#components/admin/detail/StatCell.svelte';
	import { accountFollowers } from '#lib/accounts.js';
	import { api } from '#lib/api.js';
	import { compact, monthLabel } from '#lib/culinary.js';
	import { followWorkflow } from '#lib/workflow-follow.js';
	import { workflowHref } from '#lib/workflow-status.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import * as DropdownMenu from '#ui/primitives-new/dropdown-menu/index.js';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// One person behind one or more accounts, in the dense detail layout (the brand page's): who
	// they are and whether we watch them in the head, their last 30 and 90 days in figures, every
	// post we stored of theirs, and beside it the brands they named, what found their posts and
	// who is who among their accounts.
	let { data } = $props();
	let creator: AdminCreatorOutputDto = $derived(data.creator);

	const live = $derived(creator.accounts.filter((a) => !a.handleLostAt));
	const profiles = $derived(live.filter((a) => a.platform === 'tiktok' || a.platform === 'instagram'));
	const displayName = $derived(live.find((a) => a.displayName && a.displayName !== creator.name)?.displayName);

	// Why their profiles are scraped: the head's pill and the Watch / Stop watching keys
	const watch = new CreatorWatchStore();
	$effect(() => {
		const { id, name } = creator;
		untrack(() => watch.load(id, name));
	});
	$effect(() => {
		adminCitiesStore.load();
	});
	// The cities whose runs go every week, where they are not watched yet
	const watchable = $derived(
		adminCitiesStore.list
			.filter((c) => c.active && c.cronEnabled && !watch.watchedIn.some((w) => w.id === c.id))
			.map((c) => ({ id: c.id, name: c.name }))
	);
	const pill = $derived(watch.lead ? watchPill(watch.lead) : null);

	// The latest rename of one of their accounts, for the line under the name
	const lastRename = $derived(
		creator.handleChanges.find((c) => creator.accounts.some((a) => a.id === c.account.id) && c.fromHandle)
	);

	// The name, renamed in place
	let renaming = $state(false);
	let name = $state('');
	const renameAction = createAction((value: string) => api.admin.updateCreator(creator.id, { name: value }), {
		onSuccess: () => {
			renaming = false;
			invalidateAll();
		},
		successNotification: (result) => ({ title: 'Renamed', text: result.name })
	});
	const startRename = () => {
		name = creator.name;
		renaming = true;
	};
	const saveName = () => {
		const value = name.trim();
		if (value && value !== creator.name) renameAction.execute(value);
		else renaming = false;
	};

	const copyHandle = async (handle: string) => {
		try {
			await navigator.clipboard.writeText(`@${handle}`);
			notificationManager.addNotification({ title: 'Copied', text: `@${handle}`, success: true });
		} catch {
			notificationManager.addNotification({ title: "Couldn't copy it", text: `@${handle}` });
		}
	};

	// "Scrape now": their profiles read now (a few cents), followed for five minutes, then reloaded
	let scraping = $state(false);
	const scrape = async () => {
		scraping = true;
		try {
			const { workflowId } = await api.admin.scrapeCreator(creator.id);
			if (!workflowId) {
				notificationManager.addNotification({ title: 'Nothing to scrape', text: 'They have no TikTok or Instagram profile', info: true });
				return;
			}
			const openRun = { label: 'Open run', onClick: () => goto(workflowHref(workflowId)) };
			const run = await followWorkflow(workflowId, 5 * 60_000);
			if (run.status === 'done') {
				await invalidateAll();
				notificationManager.addNotification({ title: 'Scraped', text: `${creator.name}'s profiles, read now`, success: true, action: openRun });
			} else if (run.status === 'failed') {
				notificationManager.addNotification({ title: 'The scrape failed', text: run.error, error: true, time: 20_000, action: openRun });
			} else {
				notificationManager.addNotification({ title: 'Still scraping after five minutes', text: 'It goes on by itself on Workflows', info: true, action: openRun });
			}
		} catch {
			notificationManager.addNotification({ title: "Couldn't start the scrape", error: true });
		} finally {
			scraping = false;
		}
	};

	// The figures: followers of their biggest account, the last 30 and 90 days, six months as bars
	const biggest = $derived(
		[...creator.accounts].sort((a, b) => (accountFollowers(b) ?? -1) - (accountFollowers(a) ?? -1))[0]
	);
	const followers = $derived(biggest ? accountFollowers(biggest) : undefined);
	const followersChange = $derived(biggest?.followersChange);
	const topBrand = $derived([...creator.brands].sort((a, b) => b.views - a.views)[0]);
	const postsTrend = $derived(
		creator.months.map((m) => ({ value: m.posts, text: `${monthLabel(m.month)}: ${m.posts || '—'} ${m.posts === 1 ? 'post' : 'posts'}` }))
	);
	const viewsTrend = $derived(
		creator.months.map((m) => ({ value: m.views, text: `${monthLabel(m.month)}: ${m.posts ? compact(m.views) : '—'} views` }))
	);
	const KEY_CLASS =
		'border-line bg-paper text-ink inline-grid size-[30px] cursor-pointer place-items-center rounded-md border hover:bg-white disabled:cursor-default disabled:opacity-50';
</script>

<DetailHead title={creator.name} initial={creator.name.trim().charAt(0).toUpperCase() || '?'}>
	{#snippet heading()}
		{#if renaming}
			<form
				class="flex items-center gap-1"
				onsubmit={(e) => {
					e.preventDefault();
					saveName();
				}}>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:value={name}
					autofocus
					aria-label="Creator name"
					disabled={renameAction.executing}
					class="border-line h-7 w-56 rounded-md border bg-white px-2 text-[17px] leading-tight font-[650]"
					onkeydown={(e) => e.key === 'Escape' && (renaming = false)}
					onblur={saveName} />
			</form>
		{:else}
			<span class="group inline-flex items-center gap-0.5">
				<h1 class="m-0 text-[19px] leading-tight font-[650]">{creator.name}</h1>
				<Tooltip text="Rename">
					<button
						type="button"
						aria-label="Rename creator"
						class="text-muted-foreground hover:bg-wash hover:text-ink grid size-6 cursor-pointer place-items-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
						onclick={startRename}><Pencil class="size-[13px]" strokeWidth={1.8} /></button>
				</Tooltip>
			</span>
		{/if}
	{/snippet}
	{#snippet pills()}
		{#each live as account (account.id)}
			<Pill class="group pr-[3px]">
				<PlatformIcon platform={account.platform} size={12} />
				<a href={account.url} target="_blank" rel="noreferrer" class="text-beet">@{account.handle}</a>
				<button
					type="button"
					aria-label={`Copy @${account.handle}`}
					title="Copy handle"
					class="text-muted-foreground hover:bg-sand hover:text-ink grid size-[18px] cursor-pointer place-items-center rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
					onclick={() => copyHandle(account.handle)}><Copy class="size-[11px]" /></button>
			</Pill>
		{/each}
		{#if watch.watch && profiles.length}
			{#if pill}
				<Tooltip text={pill.tip}><Pill tone="good"><Eye class="size-3" strokeWidth={2} />{pill.label}</Pill></Tooltip>
			{:else if watch.keptOff.length}
				<Tooltip text={`Their profile is a switched-off source of ${watch.keptOff.map((c) => c.name).join(', ')}, which keeps them off the creator list there.`}>
					<Pill><EyeOff class="size-3" strokeWidth={2} />Kept off {watch.keptOff.map((c) => c.name).join(', ')}</Pill>
				</Tooltip>
			{:else}
				<Tooltip text={NOT_WATCHED_TIP}><Pill><EyeOff class="size-3" strokeWidth={2} />Not watched</Pill></Tooltip>
			{/if}
		{/if}
	{/snippet}
	{#snippet sub()}
		<span class="text-muted-foreground">
			Creator{#if displayName}&nbsp;“{displayName}”{/if} · first seen {onDay(creator.createdAt)}
			{#if watch.watch && profiles.length}· {watch.cadence}{/if}
			·
			{#if lastRename}
				<Tooltip text="By the platform's user id; the day is when a scrape noticed">
					<span>was @{lastRename.fromHandle}, seen {shortDay(lastRename.seenAt)}</span>
				</Tooltip>
			{:else}
				handle unchanged
			{/if}
		</span>
	{/snippet}
	{#snippet actions()}
		{#each profiles as account (account.id)}
			<IconKey label={`Open on ${PLATFORM_NAMES[account.platform]}`} href={account.url}>
				{#snippet glyph()}<PlatformIcon platform={account.platform} size={15} />{/snippet}
			</IconKey>
		{/each}
		{#if live[0]}
			<IconKey icon={Newspaper} label="Their posts in Social" href={`/admin/posts?q=${encodeURIComponent(live[0].handle)}`} internal />
		{/if}
		{#if profiles.length}
			<IconKey label={scraping ? 'Scraping…' : 'Scrape now: their profiles read now, a few cents'} disabled={scraping} onclick={scrape}>
				{#snippet glyph()}<RefreshCw class={['size-[15px]', scraping && 'animate-spin']} strokeWidth={1.8} />{/snippet}
			</IconKey>
			{#if watch.watchedIn.length}
				<IconKey
					icon={EyeOff}
					label={`Stop watching in ${watch.watchedIn.map((c) => c.name).join(', ')}`}
					disabled={watch.stopAction.executing}
					onclick={() => watch.stopAction.execute(watch.watchedIn)} />
			{:else if watchable.length === 1}
				<IconKey
					icon={Eye}
					label={`Watch in ${watchable[0].name}: their profiles scraped daily`}
					disabled={watch.watchAction.executing || !watch.watch}
					onclick={() => watch.watchAction.execute(watchable[0])} />
			{:else if watchable.length > 1}
				<DropdownMenu.Root>
					<Tooltip text="Watch in a city: their profiles scraped daily">
						<DropdownMenu.Trigger class={KEY_CLASS} aria-label="Watch in a city" disabled={watch.watchAction.executing || !watch.watch}>
							<Eye class="size-[15px]" strokeWidth={1.8} />
						</DropdownMenu.Trigger>
					</Tooltip>
					<DropdownMenu.Content class="w-52" side="bottom" align="end">
						<DropdownMenu.Label class="text-muted-foreground font-normal">Watch in</DropdownMenu.Label>
						{#each watchable as city (city.id)}
							<DropdownMenu.Item onclick={() => watch.watchAction.execute(city)}>{city.name}</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		{/if}
	{/snippet}
</DetailHead>

<div class="flex min-w-0 flex-col gap-3 pb-12">
	<section class="bg-paper border-line flex flex-wrap rounded-md border" aria-label="Key figures">
		<StatCell
			label="Followers"
			value={followers !== undefined ? compact(followers) : '—'}
			delta={followersChange ? `${followersChange > 0 ? '+' : '−'}${compact(Math.abs(followersChange))}` : undefined}
			tone={followersChange ? (followersChange > 0 ? 'up' : 'down') : undefined}
			sub={biggest ? (PLATFORM_NAMES[biggest.platform] ?? biggest.platform) : 'no account'} />
		<StatCell label="Posts · 30 days" value={creator.recent.posts30} sub={`${creator.posts} stored in all`} trend={postsTrend} />
		<StatCell label="Views · 30 days" value={compact(creator.recent.views30)} sub={`${compact(creator.views)} stored in all`} trend={viewsTrend} />
		<StatCell
			label="Named a place"
			value={`${creator.recent.named90} / ${creator.recent.posts90}`}
			sub={`posts in 90 days${creator.recent.lastNamedAt ? ` · last ${shortDay(creator.recent.lastNamedAt)}` : ''}`} />
		<StatCell
			label="Brands named"
			value={creator.brandCount}
			sub={topBrand ? `top: ${topBrand.name}, ${compact(topBrand.views)}` : 'none yet'} />
	</section>

	<div class="flex flex-wrap items-start gap-3">
		<CreatorPostsCard creatorId={creator.id} total={creator.posts} onChanged={() => invalidateAll()} />
		<div class="flex max-w-[420px] min-w-0 flex-[1_1_340px] flex-col gap-3">
			<CreatorBrandsCard brands={creator.brands} count={creator.brandCount} />
			<CreatorFoundCard finds={creator.foundBy} />
			<CreatorAccountsCard {creator} />
		</div>
	</div>
</div>
