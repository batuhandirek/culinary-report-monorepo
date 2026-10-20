<script lang="ts">
	import { Check, Plus, Undo2, X } from '@lucide/svelte';

	import {
		type AdminAccountOutputDto,
		AdminAddBrandAccountInputDtoPlatformEnum,
		type DecideAccountPayload
	} from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { ACCOUNT_SOURCE_LABELS, branchLabel, followersText } from '#lib/accounts.js';
	import { api } from '#lib/api.js';
	import { compact, lastMonth, monthLabel, PLATFORM_LABELS } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// A brand's own TikTok and Instagram accounts, several if it has them (one per platform, one
	// per branch), with their figures: the latest monthly profile scrape (followers, views per
	// post) and the posts we stored of theirs in the month. The matcher links them by handle and
	// by a branch's Google website; its likely ones wait here to confirm, and "Not theirs" is
	// final. A branch's own account counts in reports of the branch's city only. `branches` are
	// the ones an account can belong to (a chain's); `branchId` shows a branch page's view: the
	// brand-wide accounts and that branch's own.
	interface Props {
		brandId: string;
		branches?: { id: string; name: string; street?: string }[];
		branchId?: string;
		month?: string;
	}

	let { brandId, branches = [], branchId, month = lastMonth() }: Props = $props();

	let accounts = $state<AdminAccountOutputDto[] | null>(null);
	const loader = createLoader((id: string, m: string) => api.admin.listBrandAccounts(id, { month: m }), {
		onSuccess: (list) => (accounts = list)
	});
	const refresh = () => loader.load(brandId, month);
	// Again when the page's brand or month changes
	$effect(() => {
		loader.load(brandId, month);
	});

	const WHOLE = 'brand';
	const WHOSE = $derived([
		{ value: WHOLE, label: 'The whole brand' },
		...branches.map((b) => ({ value: b.id, label: branchLabel(b) }))
	]);

	let platform = $state<string>(AdminAddBrandAccountInputDtoPlatformEnum.Instagram);
	let handle = $state('');
	let whose = $state(WHOLE);

	const addAction = createAction(
		(input: { platform: AdminAddBrandAccountInputDtoPlatformEnum; handle: string; branchId?: string }) =>
			api.admin.addBrandAccount(brandId, input),
		{
			onSuccess: () => {
				refresh();
				handle = '';
			},
			successNotification: (_, [input]) => ({ title: 'Account added', text: `@${input.handle.replace(/^@/, '')}` })
		}
	);

	const whoseAction = createAction(
		(account: AdminAccountOutputDto, branch: string | null) =>
			api.admin.updateBrandAccount(brandId, account.id, { branchId: branch }),
		{
			onSuccess: () => refresh(),
			successNotification: (_, [account, branch]) => ({
				title: branch ? "A branch's own account" : "The whole brand's account",
				text: `@${account.handle}`
			})
		}
	);

	const relink = (account: AdminAccountOutputDto) =>
		addAction.execute({
			platform: account.platform as unknown as AdminAddBrandAccountInputDtoPlatformEnum,
			handle: account.handle,
			branchId: account.branch?.id
		});

	const removeAction = createAction(
		(account: AdminAccountOutputDto) => api.admin.removeBrandAccount(brandId, account.id),
		{
			onSuccess: () => refresh(),
			successNotification: (_, [account]) => ({
				title: 'Not theirs',
				text: `@${account.handle} won't be matched to the brand again`,
				action: { label: 'Undo', onClick: () => relink(account) }
			})
		}
	);

	const confirmAction = createAction(
		(account: AdminAccountOutputDto) =>
			api.admin.decideAccount(account.id, { action: 'confirm' } as DecideAccountPayload),
		{
			onSuccess: () => refresh(),
			successNotification: (_, [account]) => ({ title: 'Their own account', text: `@${account.handle}` })
		}
	);

	// On a branch page, the brand-wide accounts and the branch's own
	const shown = (a: AdminAccountOutputDto) => !branchId || !a.branch || a.branch.id === branchId;
	const linked = $derived((accounts ?? []).filter((a) => a.brand?.id === brandId && shown(a)));
	const suggested = $derived((accounts ?? []).filter((a) => !a.brand && a.suggestedBrand?.id === brandId));
	const rejected = $derived((accounts ?? []).filter((a) => a.rejectedBrandIds.includes(brandId) && a.brand?.id !== brandId));
	const PLATFORMS = [
		{ value: AdminAddBrandAccountInputDtoPlatformEnum.Instagram, label: 'Instagram' },
		{ value: AdminAddBrandAccountInputDtoPlatformEnum.Tiktok, label: 'TikTok' }
	];
	const figures = (a: AdminAccountOutputDto) =>
		[
			`${followersText(a)} followers`,
			a.latest?.avgViews !== undefined && `${compact(a.latest.avgViews)} views per post`,
			`${monthLabel(month)}: ${a.stats.monthPosts ? `${a.stats.monthPosts} ${a.stats.monthPosts === 1 ? 'post' : 'posts'}, ${compact(a.stats.monthViews)} views` : 'no posts stored'}`,
			a.stats.lastPostedAt && `last ${onDay(a.stats.lastPostedAt)}`
		]
			.filter(Boolean)
			.join(' · ');
</script>

<AdminPanel title="Own accounts" note={linked.length || undefined}>
	{#if loader.error && !accounts}
		<ErrorState onRetry={refresh} />
	{:else if !accounts}
		<SkeletonRows count={2} lines={2} trailing />
	{:else}
		{#if linked.length === 0}
			<EmptyState
				title="No own accounts"
				hint="Linked when a handle is the venue's name or its Google website is the profile. Add one below."
				ground="none"
				size="sm" />
		{:else}
			<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
				{#each linked as account (account.id)}
					<li class="flex items-center gap-3 py-2">
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="flex min-w-0 items-baseline gap-2">
								<a href={account.url} target="_blank" rel="noreferrer" class="truncate font-medium hover:underline"
									>{PLATFORM_LABELS[account.platform]} · @{account.handle}</a>
								<a href={`/admin/creators/${account.creator.id}`} class="text-beet shrink-0 text-xs hover:underline">posts</a>
							</span>
							<span class="text-muted-foreground truncate text-xs">{figures(account)}</span>
							<span class="text-faint truncate text-xs">
								{account.branch ? `${branchLabel(account.branch)}'s own · ` : ''}{account.brandSource
									? ACCOUNT_SOURCE_LABELS[account.brandSource]
									: ''}{account.latest ? '' : ' · profile not scraped yet'}
							</span>
						</div>
						{#if branches.length && !branchId}
							<div class="w-44 shrink-0">
								<Select
									items={WHOSE}
									value={account.branch?.id ?? WHOLE}
									aria-label={`Whose is @${account.handle}`}
									size="sm"
									onValueChange={(v) =>
										v &&
										v !== (account.branch?.id ?? WHOLE) &&
										whoseAction.execute(account, v === WHOLE ? null : v)} />
							</div>
						{/if}
						<IconButton
							icon={X}
							label={`@${account.handle} is not theirs`}
							variant="ghost"
							loading={removeAction.executing}
							onclick={() => removeAction.execute(account)} />
					</li>
				{/each}
			</ul>
		{/if}

		{#if suggested.length}
			<div class="bg-tint mt-3 flex flex-col gap-2 rounded-md p-3 text-sm">
				<span class="eyebrow text-beet">Looks like theirs</span>
				{#each suggested as account (account.id)}
					<div class="flex flex-wrap items-center gap-2">
						<a href={account.url} target="_blank" rel="noreferrer" class="min-w-0 flex-1 truncate hover:underline">
							{PLATFORM_LABELS[account.platform]} · @{account.handle}
							<span class="text-muted-foreground text-xs">{followersText(account)} followers</span>
						</a>
						<Button size="sm" variant="outline" icon={Check} loading={confirmAction.executing}
							onclick={() => confirmAction.execute(account)}>It is</Button>
						<Button size="sm" variant="ghost" icon={X} loading={removeAction.executing}
							onclick={() => removeAction.execute(account)}>Not theirs</Button>
					</div>
				{/each}
			</div>
		{/if}

		<form
			class="mt-3 flex flex-wrap items-end gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				if (handle.trim())
					addAction.execute({
						platform: platform as AdminAddBrandAccountInputDtoPlatformEnum,
						handle: handle.trim(),
						...(branchId && branches.length ? { branchId } : whose !== WHOLE ? { branchId: whose } : {})
					});
			}}>
			<div class="w-36"><Select items={PLATFORMS} bind:value={platform} aria-label="Platform" /></div>
			{#if branches.length && !branchId}
				<div class="w-44"><Select items={WHOSE} bind:value={whose} aria-label="Whose account" /></div>
			{/if}
			<div class="min-w-40 flex-1">
				<Input bind:value={handle} placeholder="@handle or profile URL" aria-label="Handle" />
			</div>
			<Button type="submit" variant="outline" icon={Plus} loading={addAction.executing} disabled={!handle.trim()}
				>Add</Button>
		</form>

		{#if rejected.length}
			<div class="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
				<span>Not theirs, never matched again:</span>
				{#each rejected as account (account.id)}
					<Button size="sm" variant="ghost" icon={Undo2} onclick={() => relink(account)}>@{account.handle}</Button>
				{/each}
			</div>
		{/if}
	{/if}
</AdminPanel>
