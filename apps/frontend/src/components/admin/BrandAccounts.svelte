<script lang="ts">
	import { AtSign, Check, ExternalLink, Plus, Undo2, X } from '@lucide/svelte';

	import {
		type AdminAccountOutputDto,
		AdminAddBrandAccountInputDtoPlatformEnum,
		type DecideAccountPayload
	} from 'client';

	import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';
	import { ACCOUNT_SOURCE_LABELS, branchLabel, followersText } from '#lib/accounts.js';
	import { api } from '#lib/api.js';
	import { compact, lastMonth, monthLabel, PLATFORM_LABELS } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// A brand's own TikTok and Instagram accounts as a detail page's header key: an @ with the
	// count of linked ones (beet while the matcher's likely ones wait to confirm), opening a card
	// (a sheet on a phone) with each account and its figures: the newest snapshot's (followers,
	// views per post from the newest profile scrape) and the posts we stored of theirs in the
	// month. Picking one opens its page. Several per brand if it has them (one per platform, one
	// per branch). The matcher links them by handle and by a branch's Google website; its likely
	// ones wait in the card to confirm, and "Not theirs" is final. A branch's own account counts in
	// reports of the branch's city only. `branches` are the ones an account can belong to (a
	// chain's); `branchId` shows a branch page's view: the brand-wide accounts and that branch's own.
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
	const rejected = $derived((accounts ?? []).filter((a) => a.rejections.some((r) => r.brand.id === brandId) && a.brand?.id !== brandId));
	const PLATFORMS = [
		{ value: AdminAddBrandAccountInputDtoPlatformEnum.Instagram, label: 'Instagram' },
		{ value: AdminAddBrandAccountInputDtoPlatformEnum.Tiktok, label: 'TikTok' }
	];
	// Followers and views per post beside the handle; the month's own posts on the right
	const figures = (a: AdminAccountOutputDto) =>
		[
			followersText(a),
			a.latest?.avgViews !== undefined && `${compact(a.latest.avgViews)}/post`,
			a.branch && !branchId && `${branchLabel(a.branch)}'s own`
		]
			.filter(Boolean)
			.join(' · ');
	const monthShort = $derived(monthLabel(month).split(' ')[0].slice(0, 3));
	const monthText = (a: AdminAccountOutputDto) =>
		a.stats.monthPosts
			? `${a.stats.monthPosts} ${a.stats.monthPosts === 1 ? 'post' : 'posts'}, ${compact(a.stats.monthViews)} in ${monthShort}`
			: `no posts in ${monthShort}`;
	// How they were linked, when it is one way for all ("linked from its website")
	const sources = $derived([...new Set(linked.map((a) => a.brandSource).filter(Boolean))]);
	const sourceNote = $derived(
		sources.length === 1 ? ACCOUNT_SOURCE_LABELS[sources[0]!] : undefined
	);
	let adding = $state(false);
	let open = $state(false);
	const keyLabel = $derived(
		[
			`Own accounts${accounts ? ` · ${linked.length} linked` : ''}`,
			suggested.length && `${suggested.length} to confirm`
		]
			.filter(Boolean)
			.join(', ')
	);
	// IconKey's look, with room for the count
	const KEY =
		'border-line bg-paper text-ink relative inline-grid size-[30px] cursor-pointer place-items-center rounded-md border hover:bg-white';
</script>


<Tooltip text={keyLabel}>
	<ResponsivePopover
		bind:open
		title="Own accounts"
		hideHeader="popover"
		align="end"
		class="w-[26rem] max-w-[calc(100vw-2rem)] p-0">
		{#snippet trigger()}
			<span class={KEY} aria-label={keyLabel}>
				<AtSign class="size-[15px]" strokeWidth={1.8} />
				{#if linked.length || suggested.length}
					<span
						class={cn(
							'text-paper absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums',
							suggested.length ? 'bg-beet' : 'bg-ink'
						)}>{linked.length}</span>
				{/if}
			</span>
		{/snippet}
		<div class="flex max-h-[70vh] flex-col overflow-y-auto text-xs">
			<div class="flex min-h-10 items-center gap-2 px-3.5 pt-2.5 pb-2">
				<h2 class="m-0 text-[13px] font-semibold">Own accounts</h2>
				{#if linked.length}<span class="text-faint text-[13px] font-medium">{linked.length}</span>{/if}
				<div class="ml-auto flex min-w-0 items-center gap-1.5">
					{#if sourceNote}<span class="text-muted-foreground truncate">{sourceNote}</span>{/if}
					<IconButton
						icon={adding ? X : Plus}
						label={adding ? 'Close' : 'Add an account'}
						variant="ghost"
						xs
						onclick={() => (adding = !adding)} />
				</div>
			</div>
			{#if loader.error && !accounts}
				<div class="px-3.5 pb-3"><ErrorState onRetry={refresh} /></div>
			{:else if !accounts}
				<div class="px-3.5 pb-3"><SkeletonRows count={2} lines={1} trailing /></div>
			{:else}
				{#if linked.length === 0}
					<p class="text-muted-foreground border-line/60 m-0 border-t px-3.5 py-2.5">
						None linked: a handle that is the name, or a profile its website links, is linked by itself.
						<button type="button" class="text-beet cursor-pointer hover:underline" onclick={() => (adding = true)}>Add one</button>
					</p>
				{:else}
					<ul class="m-0 list-none p-0">
						{#each linked as account (account.id)}
							<li class="border-line/60 hover:bg-sand/50 focus-within:bg-sand/50 flex min-h-9 items-center gap-2 border-t px-3.5 py-1">
								<!-- The account's page: its posts and snapshots -->
								<a
									href={`/admin/creators/${account.creator.id}`}
									class="text-ink flex min-w-0 flex-1 items-center gap-2 hover:no-underline"
									title={`${PLATFORM_LABELS[account.platform]}: its posts`}
									onclick={() => (open = false)}>
									<PlatformIcon platform={account.platform} class="text-faint" />
									<span class="flex min-w-0 flex-1 flex-col">
										<span class="truncate font-medium hover:underline">@{account.handle}</span>
										<span class="text-muted-foreground truncate text-[11.5px]">{figures(account)} · {monthText(account)}</span>
									</span>
								</a>
								{#if branches.length && !branchId}
									<select
										class="border-line bg-paper h-6 w-[104px] shrink-0 rounded-[7px] border px-1 text-[11.5px]"
										aria-label={`Whose is @${account.handle}`}
										value={account.branch?.id ?? WHOLE}
										onchange={(e) => {
											const v = e.currentTarget.value;
											if (v !== (account.branch?.id ?? WHOLE)) whoseAction.execute(account, v === WHOLE ? null : v);
										}}>
										{#each WHOSE as option (option.value)}
											<option value={option.value}>{option.value === WHOLE ? 'Whole brand' : option.label}</option>
										{/each}
									</select>
								{/if}
								<span class="flex shrink-0">
									<IconButton icon={ExternalLink} label={`Open on ${PLATFORM_LABELS[account.platform]}`} variant="ghost" xs href={account.url} target="_blank" rel="noreferrer" />
									<IconButton
										icon={X}
										label={`@${account.handle} is not theirs`}
										variant="ghost"
										xs
										loading={removeAction.executing}
										onclick={() => removeAction.execute(account)} />
								</span>
							</li>
						{/each}
					</ul>
				{/if}

				{#if suggested.length}
					<div class="bg-tint border-line/60 flex flex-col gap-1.5 border-t px-3.5 py-2.5">
						<span class="eyebrow text-beet">Looks like theirs</span>
						{#each suggested as account (account.id)}
							<div class="flex flex-wrap items-center gap-2">
								<PlatformIcon platform={account.platform} class="text-faint" />
								<a href={account.url} target="_blank" rel="noreferrer" class="min-w-0 flex-1 truncate">
									@{account.handle}
									<span class="text-muted-foreground">· {followersText(account)}</span>
								</a>
								<Button size="sm" variant="outline" icon={Check} loading={confirmAction.executing}
									onclick={() => confirmAction.execute(account)}>It is</Button>
								<Button size="sm" variant="ghost" icon={X} loading={removeAction.executing}
									onclick={() => removeAction.execute(account)}>Not theirs</Button>
							</div>
						{/each}
					</div>
				{/if}

				{#if adding}
					<form
						class="border-line/60 flex flex-wrap items-end gap-2 border-t px-3.5 py-2.5"
						onsubmit={(e) => {
							e.preventDefault();
							if (handle.trim())
								addAction.execute({
									platform: platform as AdminAddBrandAccountInputDtoPlatformEnum,
									handle: handle.trim(),
									...(branchId && branches.length ? { branchId } : whose !== WHOLE ? { branchId: whose } : {})
								});
						}}>
						<div class="w-32"><Select items={PLATFORMS} bind:value={platform} aria-label="Platform" size="sm" /></div>
						{#if branches.length && !branchId}
							<div class="w-40"><Select items={WHOSE} bind:value={whose} aria-label="Whose account" size="sm" /></div>
						{/if}
						<div class="min-w-36 flex-1">
							<Input bind:value={handle} placeholder="@handle or profile URL" aria-label="Handle" class="h-8" />
						</div>
						<Button type="submit" size="sm" variant="outline" icon={Plus} loading={addAction.executing} disabled={!handle.trim()}
							>Add</Button>
					</form>
				{/if}

				{#if rejected.length}
					<div class="text-muted-foreground border-line/60 flex flex-wrap items-center gap-1 border-t px-3.5 py-2 text-[11.5px]">
						<span>Not theirs, never matched again:</span>
						{#each rejected as account (account.id)}
							<Button size="xs" variant="ghost" icon={Undo2} onclick={() => relink(account)}>@{account.handle}</Button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</ResponsivePopover>
</Tooltip>
