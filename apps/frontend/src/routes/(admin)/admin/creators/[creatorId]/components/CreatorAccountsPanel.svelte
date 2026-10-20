<script lang="ts">
	import { Check, Plus, Split, X } from '@lucide/svelte';
	import type { AdminAccountOutputDto, AdminCreatorOutputDto, DecideAccountPayload } from 'client';

	import { invalidateAll } from '$app/navigation';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { ACCOUNT_SOURCE_LABELS, branchLabel, followersText } from '#lib/accounts.js';
	import { api } from '#lib/api.js';
	import { compact, monthLabel, PLATFORM_LABELS } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';

	// A creator's accounts: whose each is (a venue's own says so), what we saw it post in the
	// month, and the two edits on who is who — another account is this person's too, or one is
	// not the same person.
	interface Props {
		creator: AdminCreatorOutputDto;
		month: string;
	}

	let { creator, month }: Props = $props();

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

	// "This account is theirs too": search any account by handle
	let query = $state('');
	let results = $state<AdminAccountOutputDto[]>([]);
	const searchAction = createAction(
		(q: string) => api.admin.listAccounts({ q, page: 1, size: 8 }),
		{ onSuccess: (res) => (results = res.items.filter((a) => a.creator.id !== creator.id)) }
	);
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

<AdminPanel title="Accounts" note={creator.accounts.length}>
	<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
		{#each creator.accounts as account (account.id)}
			<li class="flex items-start gap-3 py-2.5">
				<div class="flex min-w-0 flex-1 flex-col gap-0.5">
					<a href={account.url} target="_blank" rel="noreferrer" class="truncate font-medium hover:underline">
						{PLATFORM_LABELS[account.platform]} · @{account.handle}
					</a>
					{#if account.displayName}
						<span class="text-muted-foreground truncate text-xs">“{account.displayName}”</span>
					{/if}
					{#if account.brand}
						<span class="text-xs">
							<a href={`/admin/brands/${account.brand.id}`} class="font-medium hover:underline">{account.brand.name}</a
							>'s own{account.branch ? ` (${branchLabel(account.branch)})` : ''}{account.brandSource
								? ` · ${ACCOUNT_SOURCE_LABELS[account.brandSource]}`
								: ''}
						</span>
					{:else if account.suggestedBrand}
						<span class="flex flex-wrap items-center gap-2 text-xs">
							<span>
								Looks like <a href={`/admin/brands/${account.suggestedBrand.id}`} class="font-medium hover:underline"
									>{account.suggestedBrand.name}</a
								>'s own
							</span>
							<Button size="sm" variant="outline" icon={Check} loading={decideAction.executing}
								onclick={() => decideAction.execute(account, 'confirm')}>It is</Button>
							<Button size="sm" variant="ghost" icon={X} loading={decideAction.executing}
								onclick={() => decideAction.execute(account, 'reject')}>Not theirs</Button>
						</span>
					{/if}
					<span class="text-muted-foreground text-xs">
						{followersText(account)} followers · {monthLabel(month)}: {account.stats.monthPosts} posts, {compact(
							account.stats.monthViews
						)} views · {account.stats.posts} stored in all
					</span>
				</div>
				{#if creator.accounts.length > 1}
					<Button
						size="sm"
						variant="ghost"
						icon={Split}
						loading={splitAction.executing}
						onclick={() => splitAction.execute(account)}>Not the same person</Button>
				{/if}
			</li>
		{/each}
	</ul>

	<form
		class="mt-3 flex items-end gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			if (query.trim()) searchAction.execute(query.trim().replace(/^@/, ''));
		}}>
		<div class="min-w-40 flex-1">
			<Input bind:value={query} placeholder="Another account of theirs: @handle" aria-label="Find an account" />
		</div>
		<Button type="submit" variant="outline" loading={searchAction.executing} disabled={!query.trim()}>Find</Button>
	</form>
	{#if results.length}
		<ul class="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm">
			{#each results as account (account.id)}
				<li class="flex items-center gap-2">
					<span class="min-w-0 flex-1 truncate">
						{PLATFORM_LABELS[account.platform]} · @{account.handle}
						<span class="text-muted-foreground text-xs">({account.creator.name})</span>
					</span>
					<Button size="sm" variant="outline" icon={Plus} loading={mergeAction.executing} onclick={() => mergeAction.execute(account)}
						>Theirs too</Button>
				</li>
			{/each}
		</ul>
	{:else if searchAction.result && !searchAction.executing}
		<p class="text-muted-foreground m-0 mt-2 text-xs">No other account matches “{query}”.</p>
	{/if}
</AdminPanel>
