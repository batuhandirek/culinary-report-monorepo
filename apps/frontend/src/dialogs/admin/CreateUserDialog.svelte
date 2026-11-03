<script lang="ts">
	import { AdminCreateUserInputDtoRolesEnum, type AdminUserOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { createForm } from '#ui/components/form/index.js';
	import FormDialog from '#ui/components/FormDialog.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';

	interface Props {
		active?: boolean;
		onCreated?: (user: AdminUserOutputDto) => void;
	}

	let { active = $bindable(false), onCreated }: Props = $props();

	// Rebuilt each time it opens, so an abandoned draft never carries over.
	const form = $derived(
		active &&
			createForm({
				fields: {
					firstName: {
						type: 'text' as const,
						label: 'First name',
						value: '',
						validation: [(v: string) => !!v?.trim() || 'A first name is needed'],
						col: 6
					},
					lastName: { type: 'text' as const, label: 'Last name', value: '', col: 6 },
					email: {
						type: 'email' as const,
						label: 'E-mail',
						value: '',
						autocomplete: 'off',
						validation: [(v: string) => /^\S+@\S+\.\S+$/.test(v?.trim() ?? '') || 'An e-mail address is needed'],
						hint: 'They sign in with it; it counts as verified, since e-mail is off.'
					},
					password: {
						type: 'password' as const,
						label: 'Password',
						value: '',
						autocomplete: 'new-password',
						validation: [(v: string) => (v?.length ?? 0) >= 8 || 'At least 8 characters'],
						hint: 'Tell them yourself; nothing is mailed. They can change it later.'
					},
					admin: {
						type: 'checkbox' as const,
						message: 'Administrator: can see and change everything in this panel',
						value: true
					}
				}
			})
	);

	const createAction_ = createAction(
		(values: { firstName: string; lastName: string; email: string; password: string; admin: boolean }) =>
			api.admin.createUser({
				firstName: values.firstName.trim(),
				lastName: values.lastName?.trim() ?? '',
				email: values.email.trim(),
				password: values.password,
				roles: values.admin ? [AdminCreateUserInputDtoRolesEnum.Admin] : []
			}),
		{
			successNotification: (user) => ({ title: 'User created', text: `${user.email} can sign in now.` }),
			onSuccess: (user) => {
				active = false;
				onCreated?.(user as AdminUserOutputDto);
			}
		}
	);
</script>

{#if form}
	<FormDialog
		bind:active
		{form}
		title="New user"
		description="An account that signs in with e-mail and password."
		submitText="Create"
		cancelText="Cancel"
		closeOnSubmit={false}
		class="max-w-[520px]"
		onSubmit={async (values) => {
			await createAction_.execute(values as Parameters<typeof createAction_.execute>[0]);
		}} />
{/if}
