<script lang="ts">
	import { Check, Plus, Split, X } from '@lucide/svelte';
	import type { AdminAccountOutputDto, AdminCreatorOutputDto, DecideAccountPayload } from 'client';

	import { shortDay } from './creator-text.js';

	import { invalidateAll } from '$app/navigation';
	import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';
	import { ACCOUNT_SOURCE_LABELS, branchLabel, followersText } from '#lib/accounts.js';
	import { api } from '#lib/api.js';
	import { PLATFORM_LABELS } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// Who is who: their accounts when there is more to say than the header's pills (several, a
	// brand's own, the matcher's suggestion), "not the same person" on a row's hover, the handle
	// changes a scrape saw (by the platforms' user ids; a date is when a scrape noticed, never when
	// they renamed), and "another account of theirs" found by handle and taken in.
	interface Props {
		creator: AdminCreatorOutputDto;
	}

	let { creator }: Props = $props();

	const several = $derived(creator.accounts.length > 1);
	const rows = $derived(several || creator.accounts.some((a) => a.brand || a.suggestedBrand || a.handleLostAt));
	const ours = $derived(new Set(creator.accounts.map((a) => a.id)));

	const formerHandles = (account: AdminAccountOutputDto) =>
		creator.handleChanges
			.filter((c) => c.account.id === account.id && c.fromHandle && c.fromHandle !== account.handle)
			.map((c) => `@${c.fromHandle}`);

	const splitAction = createAction((account: AdminAccountOutputDto) => api.admin.splitAccount(account.id), {
		onSuccess: () => invalidateAll(),
		successNotification: (result, [account]) => ({
			title: `@${account.handle} is someone else`,
			text: 'It has a creator of its own now',
			action: { label: 'Open', onClick: () => (window.location.href = `/admin/creators/${result.creatorId}`) }
		})
	});

	// The matcher's suggestion: an admin says it is, or is not, the venue's own
	const decideAction = createAction(
		(account: AdminAccountOutputDto, action: 'confirm' | 'reject') =>
			api.admin.decideAccount(account.id, { action } as DecideAccountPayload),
		{
			onSuccess: () => invalidateAll(),
			successNotification: (_, [account, action]) => ({
				title: action === 'confirm' ? `@${account.handle} is ${account.suggestedBrand?.name}'s own` : 'Not theirs',
				text: action === 'confirm' ? undefined : `@${account.handle} won't be matched to ${account.suggestedBrand?.name} again`
			})
		}
	);

	// "This account is theirs too": any account by handle
	let query = $state('');
	let results = $state<AdminAccountOutputDto[]>([]);
	const searchAction = createAction((q: string) => api.admin.listAccounts({ q, page: 1, size: 8 }), {
		onSuccess: (res) => (results = res.items.filter((a) => a.creator.id !== creator.id))
	});
	const mergeAction = createAction(
		(account: AdminAccountOutputDto) => api.admin.mergeCreatorAccounts(creator.id, { accountIds: [account.id] }),
		{
			onSuccess: () => {
				results = [];
				query = '';
				invalidateAll();
			},
			successNotification: (_, [account]) => ({ title: `@${account.handle} is ${creator.name} too` })
		}
	);
</script>

<section class="bg-paper border-line min-w-0 rounded-md border">
	<div class="flex min-h-10 items-center gap-2 px-3.5 pt-2.5 pb-2 text-[13px] font-semibold">
		<h2 class="m-0 text-[13px] font-semibold">{rows ? 'Accounts' : 'Other accounts'}</h2>
		{#if rows}<span class="text-faint font-medium">{creator.accounts.length}</span>{/if}
	</div>

	{#if rows}
		<ul class="m-0 mb-2 flex list-none flex-col p-0 text-xs">
			{#each creator.accounts as account (account.id)}
				<li class="group hover:bg-sand/60 flex items-start gap-2 px-3.5 py-1.5">
					<PlatformIcon platform={account.platform} tip class="text-muted-foreground mt-px" />
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="flex min-w-0 items-baseline gap-1.5">
							{#if account.handleLostAt}
								<Tooltip text={`Another user has had this handle since ${shortDay(account.handleLostAt)}: what this account is called now is unknown`}>
									<span class="text-muted-foreground truncate line-through">@{account.handle}</span>
								</Tooltip>
							{:else}
								<a href={account.url} target="_blank" rel="noreferrer" class="text-beet truncate">@{account.handle}</a>
							{/if}
							<span class="text-muted-foreground shrink-0 tabular-nums">{followersText(account)}</span>
						</span>
						{#if formerHandles(account).length}
							<span class="text-muted-foreground truncate">was {formerHandles(account).join(', ')}</span>
						{/if}
						{#if account.brand}
							<span>
								<a href={`/admin/brands/${account.brand.id}`} class="text-beet">{account.brand.name}</a>'s own{account.branch
									? ` (${branchLabel(account.branch)})`
									: ''}{#if account.brandSource}<span class="text-muted-foreground"> · {ACCOUNT_SOURCE_LABELS[account.brandSource]}</span>{/if}
							</span>
						{:else if account.suggestedBrand}
							<span class="flex flex-wrap items-center gap-1.5">
								<span>Looks like <a href={`/admin/brands/${account.suggestedBrand.id}`} class="text-beet">{account.suggestedBrand.name}</a>'s own</span>
								<Button size="xs" variant="outline" icon={Check} loading={decideAction.executing} onclick={() => decideAction.execute(account, 'confirm')}
									>It is</Button>
								<Button size="xs" variant="ghost" icon={X} loading={decideAction.executing} onclick={() => decideAction.execute(account, 'reject')}
									>Not theirs</Button>
							</span>
						{/if}
					</div>
					{#if several}
						<Tooltip text="Not the same person: give it a creator of its own">
							<button
								type="button"
								aria-label={`@${account.handle} is not the same person`}
								disabled={splitAction.executing}
								class="text-muted-foreground hover:bg-wash hover:text-ink grid size-6 shrink-0 cursor-pointer place-items-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
								onclick={() => splitAction.execute(account)}><Split class="size-3.5" /></button>
						</Tooltip>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if creator.handleChanges.length}
		<details class="border-line/60 border-t px-3.5 py-2 text-xs">
			<summary class="eyebrow text-muted-foreground cursor-pointer text-[7.5px]">Handle changes · {creator.handleChanges.length}</summary>
			<ul class="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
				{#each creator.handleChanges as c (c.id)}
					<li class="flex items-baseline gap-2">
						<span class="min-w-0 flex-1">
							{#if !ours.has(c.account.id)}
								Took <b class="font-medium">@{c.fromHandle}</b>, which was
								<a href={`/admin/creators/${c.account.creator.id}`} class="text-beet">{c.account.creator.name}</a>'s
							{:else if c.toHandle && c.fromHandle}
								@{c.fromHandle} → <b class="font-medium">@{c.toHandle}</b>
							{:else if c.toHandle}
								Seen again as <b class="font-medium">@{c.toHandle}</b>
							{:else}
								Lost @{c.fromHandle}{#if c.takenBy}: <a href={`/admin/creators/${c.takenBy.creator.id}`} class="text-beet">@{c.takenBy.handle}</a> has it{/if}
							{/if}
							<span class="text-faint">· {PLATFORM_LABELS[c.account.platform]}</span>
						</span>
						<span class="text-muted-foreground shrink-0 tabular-nums">seen {shortDay(c.seenAt)}</span>
					</li>
				{/each}
			</ul>
		</details>
	{/if}

	<form
		class={['flex gap-1.5 px-3.5 pb-3', (rows || creator.handleChanges.length) && 'border-line/60 border-t pt-2.5']}
		onsubmit={(e) => {
			e.preventDefault();
			if (query.trim()) searchAction.execute(query.trim().replace(/^@/, ''));
		}}>
		<input
			bind:value={query}
			class="border-line text-ink h-[26px] min-w-0 flex-1 rounded-lg border bg-white px-2 text-xs"
			aria-label="Another account of theirs"
			placeholder="Another account of theirs: @handle" />
		<Button type="submit" size="xs" variant="outline" loading={searchAction.executing} disabled={!query.trim()}>Find</Button>
	</form>
	{#if results.length}
		<ul class="m-0 flex list-none flex-col gap-1 px-3.5 pb-3 text-xs">
			{#each results as account (account.id)}
				<li class="flex items-center gap-2">
					<PlatformIcon platform={account.platform} tip class="text-muted-foreground" />
					<span class="min-w-0 flex-1 truncate">
						@{account.handle} <span class="text-muted-foreground">({account.creator.name})</span>
					</span>
					<Button size="xs" variant="outline" icon={Plus} loading={mergeAction.executing} onclick={() => mergeAction.execute(account)}
						>Theirs too</Button>
				</li>
			{/each}
		</ul>
	{:else if searchAction.result && !searchAction.executing}
		<p class="text-muted-foreground m-0 px-3.5 pb-3 text-xs">No other account matches “{query}”.</p>
	{/if}
</section>
