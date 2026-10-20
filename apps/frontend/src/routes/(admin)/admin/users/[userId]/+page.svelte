<script lang="ts">
	import { BadgeCheck, Ellipsis, ShieldUser, Trash } from '@lucide/svelte';

	import { AdminUserOutputDtoRolesEnum } from 'client';

	import UserView from './components/UserView.svelte';

	import { goto, invalidate } from '$app/navigation';
	import { onDay } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import ChangeUserRolesDialog from '#dialogs/admin/ChangeUserRolesDialog.svelte';
	import { api } from '#lib/api.js';
	import { enumToName } from '#lib/util.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import * as DropdownMenu from '#ui/primitives-new/dropdown-menu/index.js';
	import Avatar from '#ui/wrapped/Avatar.svelte';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Buttonish from '#ui/wrapped/Buttonish.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';

	let { data } = $props();
	let user = $derived(data.user);

	const name = $derived(`${user.firstName} ${user.lastName}`.trim());
	// Every account is a `user`; only what is granted on top of that is worth a badge.
	const grantedRoles = $derived(
		user.roles.filter((role) => role !== AdminUserOutputDtoRolesEnum.User)
	);

	// Both open from the menu and live outside it: a DropdownMenu.Item unmounts its contents
	// when the menu closes.
	let changeRolesOpen = $state(false);
	let deleteOpen = $state(false);

	const deleteUserAction = createAction(() => api.admin.deleteUser(user.id), {
		onSuccess: () => goto('/admin/users'),
		successNotification: {
			title: 'User deleted',
			text: `${name} has been permanently deleted.`
		}
	});
</script>

<AdminPageHeader title={name}>
	{#snippet leftTitle()}
		<Avatar size={64} src={user.profileImage?.url} identifier={user.id} alt="" />
	{/snippet}
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">User · joined {onDay(user.createdAt)}</span>
	{/snippet}
	{#snippet belowTitle()}
		<div
			class="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
			{#each grantedRoles as role (role)}
				<Badge
					pill
					variant={role === AdminUserOutputDtoRolesEnum.Admin ? 'default' : 'secondary'}>
					{enumToName(role)}
				</Badge>
			{/each}
			{#if user.isMarkedForDeletion}
				<Badge pill variant="destructive">Marked for deletion</Badge>
			{/if}
			{#if user.email}
				<span class="flex min-w-0 items-center gap-1">
					<span class="truncate">{user.email}</span>
					{#if user.emailVerifiedAt}
						<BadgeCheck class="text-success size-4 shrink-0" aria-label="Verified" />
					{/if}
				</span>
			{/if}
			{#if user.mobileNumber}
				<span class="flex items-center gap-1 tabular-nums">
					{user.mobileNumber}
					{#if user.mobileNumberVerifiedAt}
						<BadgeCheck class="text-success size-4 shrink-0" aria-label="Verified" />
					{/if}
				</span>
			{/if}
		</div>
	{/snippet}
	{#snippet rightTitle()}
		<div class="flex shrink-0 items-center gap-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger aria-label="More actions">
					<Buttonish icon={Ellipsis} size="icon" variant="outline" iconClass="size-4" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-56" side="bottom" align="end">
					<DropdownMenu.Item onclick={() => (changeRolesOpen = true)}>
						<ShieldUser class="size-4" />
						Change roles…
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item variant="destructive" onclick={() => (deleteOpen = true)}>
						<Trash class="size-4" />
						Delete user…
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/snippet}
</AdminPageHeader>

{#key user.id}
	<UserView {user} />
{/key}

<ChangeUserRolesDialog
	bind:active={changeRolesOpen}
	{user}
	onChanged={() => invalidate(`user:${user.id}`)} />
<PopConfirm
	bind:open={deleteOpen}
	title={`Delete ${name}?`}
	description="The account is permanently deleted, and this cannot be undone."
	confirmText="Delete user"
	destructive
	onConfirm={deleteUserAction.execute} />
