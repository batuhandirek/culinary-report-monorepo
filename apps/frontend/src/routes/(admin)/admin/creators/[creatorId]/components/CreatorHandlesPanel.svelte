<script lang="ts">
	import type { AdminCreatorOutputDto } from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { PLATFORM_LABELS } from '#lib/culinary.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	// A creator's handles over time, told by the platforms' user ids: what their accounts are called
	// now, the handles they left (renamed away, or since used by someone else) and every change a
	// scrape saw, with the handles their accounts took from others. Dates are when a scrape noticed,
	// never when the person renamed.
	interface Props {
		creator: AdminCreatorOutputDto;
	}

	let { creator }: Props = $props();

	type Change = AdminCreatorOutputDto['handleChanges'][number];
	type Ref = Change['account'];

	const ours = $derived(new Set(creator.accounts.map((a) => a.id)));
	const current = $derived(creator.accounts.filter((a) => !a.handleLostAt));
	// Handles their accounts had before, newest first, each with what became of it
	const left = $derived(creator.handleChanges.filter((c) => ours.has(c.account.id) && c.fromHandle));

	const creatorHref = (ref: Ref) => `/admin/creators/${ref.creator.id}`;
	const other = (ref: Ref) => !ours.has(ref.id);
</script>

{#snippet account(ref: Ref, handle: string)}
	{#if other(ref)}
		<a href={creatorHref(ref)} class="font-medium hover:underline">@{handle}</a>
		<span class="text-muted-foreground">({ref.creator.name})</span>
	{:else}
		<span class="font-medium">@{handle}</span>
	{/if}
{/snippet}

<AdminPanel title="Handles" note="by the platforms' user ids">
	<div class="flex flex-col gap-4 text-sm">
		<div class="flex flex-col gap-1">
			<span class="text-muted-foreground text-xs font-medium">Now</span>
			{#if current.length}
				<ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
					{#each current as a (a.id)}
						<li>
							<span class="text-muted-foreground text-xs">{PLATFORM_LABELS[a.platform]}</span>
							<span class="font-medium">@{a.handle}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<span class="text-muted-foreground text-xs">No handle of theirs is known now.</span>
			{/if}
		</div>

		{#if left.length}
			<div class="flex flex-col gap-1">
				<span class="text-muted-foreground text-xs font-medium">Handles they left</span>
				<ul class="m-0 flex list-none flex-col gap-1 p-0">
					{#each left as c (c.id)}
						<li class="flex flex-wrap items-baseline gap-x-1.5">
							<span class="text-muted-foreground text-xs">{PLATFORM_LABELS[c.account.platform]}</span>
							<span class="font-medium">@{c.fromHandle}</span>
							<span class="text-muted-foreground text-xs">
								{#if c.takenBy}
									· used by {@render account(c.takenBy, c.takenBy.handle)} since {onDay(c.seenAt)}
								{:else}
									· left for @{c.toHandle} by {onDay(c.seenAt)}
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex flex-col gap-1">
			<span class="text-muted-foreground text-xs font-medium">Changes</span>
			{#if creator.handleChanges.length}
				<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
					{#each creator.handleChanges as c (c.id)}
						<li class="flex items-baseline gap-3 py-1.5">
							<span class="text-muted-foreground w-20 shrink-0 text-xs">{PLATFORM_LABELS[c.account.platform]}</span>
							<span class="min-w-0 flex-1">
								{#if other(c.account)}
									Took <span class="font-medium">@{c.fromHandle}</span>, which was
									<a href={creatorHref(c.account)} class="font-medium hover:underline">{c.account.creator.name}</a>'s
								{:else if c.toHandle && c.fromHandle}
									Renamed @{c.fromHandle} → <span class="font-medium">@{c.toHandle}</span>
								{:else if c.toHandle}
									Seen again as <span class="font-medium">@{c.toHandle}</span>
									<span class="text-muted-foreground text-xs">(its handle in between is unknown)</span>
								{:else}
									Lost @{c.fromHandle}{#if c.takenBy}: {@render account(c.takenBy, c.takenBy.handle)} uses it now{/if}
								{/if}
							</span>
							<span class="text-muted-foreground shrink-0 text-xs tabular-nums">seen {onDay(c.seenAt)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					title="No handle change seen"
					hint="A change shows once a scrape sees one of their user ids under another handle."
					ground="none"
					size="sm" />
			{/if}
		</div>
	</div>
</AdminPanel>
