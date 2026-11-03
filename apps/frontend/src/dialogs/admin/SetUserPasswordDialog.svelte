<script lang="ts">
	import type { AdminUserOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createForm } from '#ui/components/form/index.js';
	import FormDialog from '#ui/components/FormDialog.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';

	interface Props {
		user: AdminUserOutputDto;
		active?: boolean;
	}

	let { user, active = $bindable(false) }: Props = $props();

	const isSelf = $derived(user.id === userStore.userId);

	// Rebuilt each time it opens, so a typed password never sits in a closed dialog.
	const form = $derived(
		active &&
			createForm({
				fields: {
					password: {
						type: 'password' as const,
						label: 'New password',
						value: '',
						autocomplete: 'new-password',
						validation: [(v: string) => (v?.length ?? 0) >= 8 || 'At least 8 characters']
					},
					repeat: {
						type: 'password' as const,
						label: 'Repeat it',
						value: '',
						autocomplete: 'new-password',
						validation: [(v: string) => !!v || 'Type it again']
					}
				}
			})
	);

	const saveAction = createAction((password: string) => api.admin.setUserPassword(user.id, { password }), {
		successNotification: () => ({
			title: 'Password changed',
			text: isSelf ? 'Your other sessions were signed out.' : `${user.firstName} was signed out everywhere.`
		}),
		onSuccess: () => (active = false)
	});
</script>

{#if form}
	<FormDialog
		bind:active
		{form}
		title={isSelf ? 'Change your password' : `Set a password for ${user.firstName} ${user.lastName}`.trim()}
		description={isSelf
			? 'This session stays signed in; every other one is signed out.'
			: 'No old password is needed. They are signed out of every session and sign in with the new one.'}
		submitText="Save"
		cancelText="Cancel"
		closeOnSubmit={false}
		class="max-w-[480px]"
		onSubmit={async (values) => {
			const v = values as { password: string; repeat: string };
			if (v.password !== v.repeat) {
				if (form) form.errors.repeat = ['The two passwords differ'];
				return;
			}
			await saveAction.execute(v.password);
		}} />
{/if}
