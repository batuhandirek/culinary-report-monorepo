<script lang="ts">
	import type { PortalSettingsOutputDto, PortalUpdateSettingsInputDtoLanguageEnum } from 'client';

	import { untrack } from 'svelte';

	import { EMAIL_REGEX } from '#constants/REGEXES.js';
	import { api } from '#lib/api.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createForm, Form } from '#ui/components/form/index.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Notice from '#ui/wrapped/Notice.svelte';

	interface Props {
		brandId: string;
		settings: PortalSettingsOutputDto;
	}

	let { brandId, settings }: Props = $props();
	// The form starts from what was loaded; the page mounts a new one per load
	const initial = untrack(() => settings);

	const LANGUAGES = [
		{ value: 'en' as const, label: 'English' },
		{ value: 'de' as const, label: 'Deutsch' }
	];

	const form = createForm({
		fields: {
			contactEmail: {
				type: 'email' as const,
				label: 'Send the monthly report to',
				placeholder: 'you@your-venue.de',
				hint: 'Empty: we keep it here in the portal and send no mail.',
				autocomplete: 'email' as const,
				validation: [
					(value: string) =>
						!value || EMAIL_REGEX.test(value.trim()) ? true : 'That does not look like an e-mail address'
				],
				value: initial.contactEmail ?? ''
			},
			language: {
				type: 'select' as const,
				label: 'Our e-mails to you',
				hint: 'The reports themselves are in English for now.',
				items: LANGUAGES,
				value: initial.language
			}
		},
		onSubmit: async (): Promise<void> => {
			try {
				const saved = await api.portal.updatePortalSettings(brandId, {
					contactEmail: form.values.contactEmail?.trim() || null,
					language: form.values.language as unknown as PortalUpdateSettingsInputDtoLanguageEnum
				});
				form.values.contactEmail = saved.contactEmail ?? '';
				notificationManager.addNotification({ title: 'Saved', success: true });
			} catch {
				notificationManager.addNotification({
					title: "We couldn't save that",
					text: 'Try again in a moment.',
					error: true
				});
			}
		}
	});
</script>

<div class="bg-paper border-line rounded-md border px-5 py-6 sm:px-8">
	{#if settings.editable}
		<Form {form} submitText="Save" />
	{:else}
		<Notice
			tone="neutral"
			title="Nothing to set here yet"
			text="Write to hello@culinaryreport.com to change where your report goes." />
	{/if}
</div>

<div class="flex flex-col gap-1 px-1">
	<span class="eyebrow text-muted-foreground">Signed in as</span>
	<span class="text-ink text-sm break-all">{userStore.user?.email}</span>
</div>
