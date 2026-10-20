<script lang="ts">
	import { ShieldAlert, TriangleAlert } from '@lucide/svelte';

	import {
		AdminUpdateUserRolesInputDtoRolesEnum,
		type AdminUserOutputDto,
		AdminUserOutputDtoRolesEnum
	} from 'client';

	import { api } from '#lib/api.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';

	interface Props {
		user: AdminUserOutputDto;
		active?: boolean;
		trigger?: import('svelte').Snippet;
		onChanged?: () => void;
	}

	let { user, active = $bindable(false), trigger, onChanged }: Props = $props();

	type Role = AdminUpdateUserRolesInputDtoRolesEnum;

	// `user` is the baseline every account carries, so it is never a toggle — and the
	// generated enum holds exactly the roles the backend will assign (`system` is not one
	// of them), so a role added there shows up here without another edit.
	const BASELINE: Role = AdminUpdateUserRolesInputDtoRolesEnum.User;
	const GRANTABLE_ROLES = Object.values(AdminUpdateUserRolesInputDtoRolesEnum).filter(
		(role) => role !== BASELINE
	);

	const ROLE_COPY: Partial<Record<Role, { label: string; warning?: string }>> = {
		[AdminUpdateUserRolesInputDtoRolesEnum.Admin]: {
			label: 'Administrator',
			warning:
				'An administrator can see and change every user, listing and category in this panel.'
		},
		[AdminUpdateUserRolesInputDtoRolesEnum.Promoter]: {
			label: 'Promoter'
		}
	};

	let selected = $state<Role[]>([]);

	const currentRoles = $derived(user.roles as unknown as Role[]);
	const isSystemAccount = $derived(user.roles.includes(AdminUserOutputDtoRolesEnum.System));
	const isSelf = $derived(user.id === userStore.userId);
	const blockedReason = $derived(
		isSelf
			? 'You cannot change your own roles.'
			: isSystemAccount
				? "The system account's roles cannot be changed."
				: null
	);
	const changed = $derived(
		GRANTABLE_ROLES.some((role) => selected.includes(role) !== currentRoles.includes(role))
	);
	const newlyGranted = $derived(
		GRANTABLE_ROLES.filter((role) => selected.includes(role) && !currentRoles.includes(role))
	);

	function toggle(role: Role, checked: boolean) {
		selected = checked ? [...selected, role] : selected.filter((r) => r !== role);
	}

	const saveAction = createAction(
		() => api.admin.updateUserRoles(user.id, { roles: [BASELINE, ...selected] }),
		{
			successNotification: {
				title: 'Roles updated',
				text: 'The user was signed out — the new roles apply when they sign back in'
			},
			onSuccess: () => {
				active = false;
				onChanged?.();
			}
		}
	);
</script>

<Dialog.Root
	bind:open={active}
	onOpenChange={() => {
		// Open on the roles the user currently has, so a reopened dialog never carries
		// over an abandoned edit.
		selected = GRANTABLE_ROLES.filter((role) => currentRoles.includes(role));
	}}>
	{#if trigger}
		<Dialog.Trigger>
			{@render trigger?.()}
		</Dialog.Trigger>
	{/if}

	<Dialog.Content class="text-sm max-w-[480px]" preventScroll>
		<Dialog.Header>
			<Dialog.Title>Change roles of {user.firstName} {user.lastName}</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-4 mt-4">
			<div>
				<div class="mb-1 text-xs font-medium">Current roles</div>
				<div class="muted text-xs">{user.roles.join(', ')}</div>
			</div>

			{#if blockedReason}
				<div class="flex items-start gap-2 text-xs text-warning">
					<TriangleAlert class="size-4 shrink-0" />
					<span>{blockedReason}</span>
				</div>
			{:else}
				{#each GRANTABLE_ROLES as role (role)}
					<Checkbox
						checked={selected.includes(role)}
						onCheckedChange={(checked) => toggle(role, checked)}>
						<span class="text-sm">{ROLE_COPY[role]?.label ?? role}</span>
					</Checkbox>
				{/each}

				<div class="muted text-xs">
					Every account keeps the <span class="font-mono">user</span> role; the roles above
					are granted on top of it.
				</div>

				{#each newlyGranted as role (role)}
					{#if ROLE_COPY[role]?.warning}
						<div class="flex items-start gap-2 text-xs text-warning">
							<ShieldAlert class="size-4 shrink-0" />
							<span>{ROLE_COPY[role]?.warning}</span>
						</div>
					{/if}
				{/each}

				<div class="muted text-xs">
					Saving signs the user out of every session; the new roles apply from their next
					sign-in.
				</div>
			{/if}
		</div>

		<Dialog.Footer class="gap-1 mt-4">
			<Button onclick={() => (active = false)} variant="outline">Cancel</Button>
			<Button
				disabled={!!blockedReason || !changed}
				loading={saveAction.executing}
				onclick={() => saveAction.execute()}>
				Save
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
