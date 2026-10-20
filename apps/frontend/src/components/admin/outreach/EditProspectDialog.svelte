<script lang="ts">
	import type { AdminProspectOutputDto, AdminUpdateProspectInputDtoLanguageEnum } from 'client';

	import { EMAIL_REGEX } from '#constants/REGEXES.js';
	import { api } from '#lib/api.js';
	import FormDialog from '#ui/components/FormDialog.svelte';
	import { notificationManager } from '#ui/lib/notification-manager.js';

	interface Props {
		prospect: AdminProspectOutputDto;
		active?: boolean;
		onChange: (prospect: AdminProspectOutputDto) => void;
	}

	let { prospect, active = $bindable(false), onChange }: Props = $props();

	const isEmail = (value: string) =>
		!value || EMAIL_REGEX.test(value.trim()) || 'That is not an email address';

	// Rebuilt from the prospect, so the dialog always opens on what is saved
	const form = $derived({
		fields: {
			contactName: {
				type: 'text' as const,
				label: 'Contact',
				placeholder: 'The owner or a manager',
				value: prospect.contactName ?? '',
				col: 6
			},
			contactEmail: {
				type: 'email' as const,
				label: 'Email',
				placeholder: 'owner@venue.de',
				value: prospect.contactEmail ?? '',
				validation: [isEmail],
				col: 6
			},
			instagram: {
				type: 'text' as const,
				label: 'Instagram',
				placeholder: '@handle or profile link',
				value: prospect.instagram ? `@${prospect.instagram}` : '',
				col: 6
			},
			language: {
				type: 'select' as const,
				label: 'Write to them in',
				items: [
					{ value: 'en', label: 'English' },
					{ value: 'de', label: 'Deutsch' }
				],
				value: prospect.language as string,
				col: 6
			},
			hook: {
				type: 'textarea' as const,
				label: 'Lead with',
				hint: 'One finding from their report, in the language you write in. The first email, the DM and the call quote it.',
				rows: 3,
				maxlength: 2000,
				value: prospect.hook ?? ''
			},
			notes: {
				type: 'textarea' as const,
				label: 'Notes',
				hint: 'For you: why they would buy, who decides, when they are in.',
				rows: 4,
				maxlength: 10000,
				value: prospect.notes ?? ''
			}
		}
	});

	const blank = (value: string) => value.trim() || null;
</script>

<FormDialog
	bind:active
	{form}
	title={`Edit ${prospect.brand.name}`}
	submitText="Save"
	cancelText="Cancel"
	class="max-w-[640px]"
	onSubmit={async (values) => {
		const updated = await api.admin.updateProspect(prospect.id, {
			contactName: blank(values.contactName),
			contactEmail: blank(values.contactEmail),
			instagram: blank(values.instagram),
			language: values.language as AdminUpdateProspectInputDtoLanguageEnum,
			hook: blank(values.hook),
			notes: blank(values.notes)
		});
		onChange(updated);
		notificationManager.addNotification({ title: 'Saved', success: true });
	}} />
