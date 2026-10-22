<script lang="ts">
	import { Pencil, Sparkles, Trash2, X } from '@lucide/svelte';
	import type { AdminProspectOutputDto } from 'client';

	import EditProspectDialog from './EditProspectDialog.svelte';

	import { goto } from '$app/navigation';
	import { ago, onDay } from '#components/admin/admin-format.js';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { instagramUrl } from '#lib/outreach-template.js';
	import { popConfirmManager } from '#ui/components/pop-confirm/pop-confirm-manager.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';

	// Who to write to, what to lead with, and when to write again.
	interface Props {
		prospect: AdminProspectOutputDto;
		onChange: (prospect: AdminProspectOutputDto) => void;
		/** After "Remove from outreach"; the default goes back to the outreach list. */
		onRemove?: () => void;
	}

	let { prospect, onChange, onRemove = () => goto('/admin/brands?segment=prospects') }: Props = $props();

	let editing = $state(false);

	const ownAccounts = $derived(prospect.latestReport?.ownAccounts ?? []);

	// Google's website links carry tracking parameters: show the domain only
	const host = (url?: string) => {
		if (!url) return undefined;
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	};
	const facts = $derived<AdminFact[]>([
		{ label: 'Contact', value: prospect.contactName },
		{
			label: 'Email',
			value: prospect.contactEmail,
			href: prospect.contactEmail ? `mailto:${prospect.contactEmail}` : undefined
		},
		{
			label: 'Instagram',
			value: prospect.instagram ? `@${prospect.instagram}` : undefined,
			href: prospect.instagram ? instagramUrl(prospect.instagram) : undefined,
			// Their own posts name the handle even before anyone typed it in
			hint:
				!prospect.instagram && ownAccounts.length
					? `seen posting as ${ownAccounts.map((a) => `@${a.handle} (${a.platform === 'tiktok' ? 'TikTok' : 'Instagram'})`).join(', ')}`
					: undefined
		},
		{
			label: 'E-mail OK',
			value: prospect.emailConsentAt ? `since ${onDay(prospect.emailConsentAt)}` : undefined,
			tone: prospect.emailConsentAt ? 'success' : undefined,
			// Nothing on record: the composer warns before a cold e-mail
			hint: prospect.emailConsentAt ? undefined : 'needed before a cold e-mail (UWG §7)'
		},
		{
			label: 'Phone',
			value: prospect.venue?.phone,
			href: prospect.venue?.phone ? `tel:${prospect.venue.phone.replaceAll(' ', '')}` : undefined
		},
		{
			label: 'Website',
			value: host(prospect.venue?.website),
			href: prospect.venue?.website ?? undefined,
			hint: prospect.venue?.website && !prospect.contactEmail ? 'its Impressum has an email' : undefined
		},
		{ label: 'Language', value: prospect.language === 'de' ? 'Deutsch' : 'English' }
	]);

	// The follow-up date in local `YYYY-MM-DD`, as the date input speaks it
	const followUpDay = $derived(
		prospect.nextFollowUpAt ? new Date(prospect.nextFollowUpAt).toLocaleDateString('en-CA') : ''
	);
	const followUpAction = createAction(
		(day: string | null) =>
			api.admin.updateProspect(prospect.id, {
				nextFollowUpAt: day ? new Date(`${day}T09:00:00`).toISOString() : null
			}),
		{
			onSuccess: (updated) => onChange(updated),
			successNotification: (updated) => ({
				title: updated.nextFollowUpAt
					? `Follow up on ${onDay(updated.nextFollowUpAt)}`
					: 'No follow-up set'
			})
		}
	);

	// One LLM call from the venue's newest report and lead signals, over the current hook
	const hookAction = createAction(() => api.admin.writeProspectHook(prospect.id), {
		onSuccess: (updated) => onChange(updated),
		successNotification: { title: 'Hook written', text: 'Edit it if it does not sound like you' }
	});

	const removeAction = createAction(() => api.admin.removeProspect(prospect.id), {
		onSuccess: () => onRemove(),
		successNotification: () => ({ title: 'Removed from outreach', text: prospect.brand.name })
	});
	const confirmRemove = () =>
		popConfirmManager.show({
			title: `Remove ${prospect.brand.name}?`,
			description:
				'The prospect and its whole log are deleted. To keep the history, move it to Lost instead.',
			confirmText: 'Remove',
			destructive: true,
			onConfirm: () => removeAction.execute()
		});
</script>

<AdminPanel title="Contact">
	{#snippet action()}
		<Button variant="ghost" size="sm" icon={Pencil} onclick={() => (editing = true)}>Edit</Button>
	{/snippet}
	<div class="flex flex-col gap-4">
		<AdminFacts items={facts} />

		<div class="flex flex-col gap-1">
			<div class="flex items-center justify-between gap-2">
				<span class="eyebrow text-beet">Lead with</span>
				<Button
					variant="ghost"
					size="sm"
					icon={Sparkles}
					loading={hookAction.executing}
					onclick={() => hookAction.execute()}>
					Suggest a hook
				</Button>
			</div>
			{#if prospect.hook}
				<p class="m-0 text-sm">{prospect.hook}</p>
			{:else}
				<p class="text-muted-foreground m-0 text-sm">
					Not written yet: one finding from their report, for the first email.
					<button type="button" class="text-beet hover:underline" onclick={() => (editing = true)}
						>Write it</button>
				</p>
			{/if}
		</div>

		{#if prospect.notes}
			<div class="flex flex-col gap-1">
				<span class="eyebrow text-muted-foreground">Notes</span>
				<p class="text-muted-foreground m-0 text-sm whitespace-pre-wrap">{prospect.notes}</p>
			</div>
		{/if}

		<div class="border-line flex flex-col gap-2 border-t pt-4">
			<span class="eyebrow text-muted-foreground">Next follow-up</span>
			<div class="flex items-center gap-2">
				<div class="w-44">
					<Input
						type="date"
						value={followUpDay}
						disabled={prospect.stage === 'OPTED_OUT' || followUpAction.executing}
						onchange={(e: Event) => {
							const day = (e.currentTarget as HTMLInputElement).value;
							if (day !== followUpDay) followUpAction.execute(day || null);
						}}
						aria-label="Next follow-up" />
				</div>
				{#if prospect.nextFollowUpAt}
					<span class="text-muted-foreground text-xs">{ago(prospect.nextFollowUpAt)}</span>
					<IconButton
						icon={X}
						label="No follow-up"
						variant="ghost"
						onclick={() => followUpAction.execute(null)} />
				{/if}
			</div>
			<span class="text-muted-foreground text-xs">
				{prospect.outreachCount}
				{prospect.outreachCount === 1 ? 'try' : 'tries'} so far{prospect.lastTouchAt
					? `, last ${onDay(prospect.lastTouchAt)}`
					: ''}. Logging a message sets this for you: 4 days after the first, 7 after the second; a
				visit's or call's come-back time instead.
			</span>
		</div>

		{#if prospect.stage !== 'OPTED_OUT'}
			<div class="border-line border-t pt-3">
				<Button
					variant="ghost"
					size="sm"
					icon={Trash2}
					loading={removeAction.executing}
					onclick={confirmRemove}>Remove from outreach</Button>
			</div>
		{/if}
	</div>
</AdminPanel>

<EditProspectDialog {prospect} bind:active={editing} {onChange} />
