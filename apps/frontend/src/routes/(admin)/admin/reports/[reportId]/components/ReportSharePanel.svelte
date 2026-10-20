<script lang="ts">
	import { Copy, Link, Mail, MessageCircle, X } from '@lucide/svelte';

	import {
		AdminLogOutreachTouchInputDtoKindEnum as TouchKind,
		type AdminReportOutputDto,
		type AdminReportShareOutputDto
	} from 'client';

	import { at, atShort } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { monthLabel } from '#lib/culinary.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Private links to this report (`/r/<token>`), with how often each was opened. When the venue
	// is a prospect, sending a link can be logged on its outreach record in one click.
	interface Props {
		report: AdminReportOutputDto;
	}

	let { report }: Props = $props();

	let shares = $state<AdminReportShareOutputDto[] | null>(null);
	const loader = createAutoLoader(api.admin.listReportShares, [report.id], {
		onSuccess: (list) => (shares = list)
	});

	// The brand's place in the sales pipeline, if it has one
	let prospect = $state<{ id: string; stage: string } | null>(null);
	createAutoLoader(api.admin.listProspects, [{ page: 1, size: 1, brandId: report.brand.id }], {
		onSuccess: (res) => (prospect = res.items[0] ?? null)
	});
	const canLog = $derived(!!prospect && prospect.stage !== 'OPTED_OUT');

	const copy = async (share: AdminReportShareOutputDto) => {
		await navigator.clipboard.writeText(share.url);
		notificationManager.addNotification({
			title: 'Link copied',
			text: share.url,
			success: true
		});
	};

	const createShareAction = createAction(() => api.admin.createReportShare(report.id), {
		onSuccess: (share) => {
			shares = [share, ...(shares ?? [])];
			copy(share).catch(() => undefined);
		}
	});

	let revoking = $state<AdminReportShareOutputDto | null>(null);
	let confirmRevoke = $state(false);
	const revokeAction = createAction(
		(share: AdminReportShareOutputDto) => api.admin.revokeReportShare(report.id, share.id),
		{
			onSuccess: (revoked) =>
				(shares = (shares ?? []).map((s) => (s.id === revoked.id ? revoked : s))),
			successNotification: { title: 'Link turned off', text: 'It answers "not found" now' }
		}
	);

	const logAction = createAction(
		(share: AdminReportShareOutputDto, kind: TouchKind) =>
			api.admin.logOutreachTouch(prospect!.id, {
				kind,
				body: `${monthLabel(report.month)} report: ${share.url}`,
				template: 'report-link'
			}),
		{
			onSuccess: (updated) => (prospect = updated),
			successNotification: (_, [, kind]) => ({
				title: kind === TouchKind.EMAIL ? 'Logged as e-mailed' : 'Logged as sent by DM',
				text: `On ${report.brand.name}'s outreach record`
			})
		}
	);

	const live = $derived((shares ?? []).filter((s) => !s.revokedAt).length);
</script>

<AdminPanel title="Share" note={live || undefined}>
	{#snippet action()}
		<Button
			size="sm"
			variant="outline"
			icon={Link}
			loading={createShareAction.executing}
			onclick={() => createShareAction.execute()}>
			New link
		</Button>
	{/snippet}

	{#if loader.error && !shares}
		<ErrorState onRetry={() => loader.load(report.id)} />
	{:else if !shares}
		<SkeletonRows count={2} lines={2} trailing />
	{:else if shares.length === 0}
		<EmptyState
			title="Not shared yet"
			hint="A link opens this report on any phone without a login, with a PDF download. You see when it is opened."
			ground="none"
			size="sm" />
	{:else}
		<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
			{#each shares as share (share.id)}
				<li class="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
					<div class="min-w-0 flex-1">
						<span
							class={[
								'font-term block truncate text-base leading-tight',
								share.revokedAt && 'text-muted-foreground line-through'
							]}>
							{share.url}
						</span>
						<span class="text-muted-foreground block text-xs">
							Made {atShort(share.createdAt)}{share.createdBy
								? ` by ${share.createdBy.firstName}`
								: ''}
							{#if share.revokedAt}· turned off {atShort(share.revokedAt)}{/if}
						</span>
					</div>
					<span
						class="w-40 shrink-0 text-right text-xs tabular-nums"
						title={at(share.lastOpenedAt)}>
						{#if share.openCount}
							<span class="font-medium">
								{share.openCount}
								{share.openCount === 1 ? 'open' : 'opens'}
							</span>
							<span class="text-muted-foreground block"
								>last {atShort(share.lastOpenedAt)}</span>
						{:else}
							<span class="text-muted-foreground">Not opened yet</span>
						{/if}
					</span>
					{#if share.revokedAt}
						<Badge variant="secondary">Off</Badge>
					{:else}
						<div class="flex shrink-0 items-center gap-1">
							{#if canLog}
								<Button
									size="sm"
									variant="ghost"
									icon={Mail}
									loading={logAction.executing}
									onclick={() => logAction.execute(share, TouchKind.EMAIL)}>
									Log as e-mailed
								</Button>
								<Button
									size="sm"
									variant="ghost"
									icon={MessageCircle}
									loading={logAction.executing}
									onclick={() => logAction.execute(share, TouchKind.DM)}>
									Log as DM
								</Button>
							{/if}
							<IconButton
								icon={Copy}
								label="Copy link"
								variant="ghost"
								onclick={() => copy(share)} />
							<IconButton
								icon={X}
								label="Turn link off"
								variant="ghost"
								loading={revokeAction.executing && revoking?.id === share.id}
								onclick={() => {
									revoking = share;
									confirmRevoke = true;
								}} />
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</AdminPanel>

<PopConfirm
	bind:open={confirmRevoke}
	title="Turn this link off?"
	description="Anyone opening it sees “not found” from now on. Its open count stays here. This can't be undone; make a new link instead."
	confirmText="Turn off"
	destructive
	onConfirm={() => revoking && revokeAction.execute(revoking)} />
