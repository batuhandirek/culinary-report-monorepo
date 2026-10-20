<script lang="ts">
	import { ExternalLink, Send, UserMinus } from '@lucide/svelte';
	import type { AdminPortalMemberOutputDto, AdminProspectOutputDto } from 'client';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { EMAIL_REGEX } from '#constants/REGEXES.js';
	import { api } from '#lib/api.js';
	import { popConfirmManager } from '#ui/components/pop-confirm/pop-confirm-manager.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';

	// Who can open the brand's portal: the invite (a mail with the sign-in link, in the
	// prospect's language), who accepted it, and taking someone off again.
	interface Props {
		prospect: AdminProspectOutputDto;
		onChange: (prospect: AdminProspectOutputDto) => void;
	}

	let { prospect, onChange }: Props = $props();

	const members = $derived(prospect.portalMembers ?? []);
	let email = $state('');
	// The contact's address until the admin types another
	$effect(() => {
		if (!email && prospect.contactEmail) email = prospect.contactEmail;
	});

	const valid = $derived(EMAIL_REGEX.test(email.trim()));
	const already = $derived(
		members.some((member) => member.user.email === email.trim().toLowerCase())
	);

	const inviteAction = createAction(
		() => api.admin.inviteToPortal(prospect.id, { email: email.trim() }),
		{
			onSuccess: (updated) => onChange(updated),
			successNotification: () => ({
				title: already ? 'Invite sent again' : 'Invited to the portal',
				text: email.trim()
			})
		}
	);

	const removeAction = createAction(
		(member: AdminPortalMemberOutputDto) => api.admin.removePortalMember(prospect.id, member.id),
		{
			onSuccess: (updated) => onChange(updated),
			successNotification: (_, [member]) => ({
				title: 'Taken off the portal',
				text: member.user.email ?? ''
			})
		}
	);
	const confirmRemove = (member: AdminPortalMemberOutputDto) =>
		popConfirmManager.show({
			title: `Take ${member.user.email} off the portal?`,
			description: 'They lose access at once. Their account stays.',
			confirmText: 'Take off',
			destructive: true,
			onConfirm: () => removeAction.execute(member)
		});
</script>

<AdminPanel title="Portal">
	{#snippet action()}
		<Button
			variant="link"
			size="sm"
			icon={ExternalLink}
			href={`/portal/${prospect.brand.id}`}
			newTab>Open</Button>
	{/snippet}
	<div class="flex flex-col gap-4">
		{#if members.length}
			<ul class="m-0 flex list-none flex-col gap-2 p-0">
				{#each members as member (member.id)}
					<li class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm font-medium">{member.user.email}</span>
							<span class="text-muted-foreground text-xs">
								{member.role === 'OWNER' ? 'Owner' : 'Staff'} · invited {onDay(member.createdAt)} ·
								{member.acceptedAt ? `signed in ${onDay(member.acceptedAt)}` : 'not signed in yet'}
							</span>
						</div>
						<IconButton
							icon={UserMinus}
							label="Take off the portal"
							variant="ghost"
							onclick={() => confirmRemove(member)} />
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">
				Nobody yet. The invite mails a sign-in link; they sign in with a code sent to that
				address, no password.
			</p>
		{/if}

		<form
			class="border-line flex flex-col gap-2 border-t pt-4"
			onsubmit={(e) => {
				e.preventDefault();
				if (valid) inviteAction.execute();
			}}>
			<span class="eyebrow text-muted-foreground">Invite</span>
			<div class="flex items-center gap-2">
				<div class="min-w-0 flex-1">
					<Input type="email" bind:value={email} placeholder="owner@venue.de" aria-label="E-mail to invite" />
				</div>
				<Button
					type="submit"
					variant="outline"
					icon={Send}
					disabled={!valid}
					loading={inviteAction.executing}>{already ? 'Send again' : 'Invite'}</Button>
			</div>
			<span class="text-muted-foreground text-xs">
				The mail is in {prospect.language === 'de' ? 'German' : 'English'}, the prospect's
				language.
			</span>
		</form>
	</div>
</AdminPanel>
