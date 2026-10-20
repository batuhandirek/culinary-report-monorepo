<script lang="ts">
	import { ExceptionCodes } from 'exceptions/src';
	import type { Snippet } from 'svelte';

	import { exceptionCodeOf, notifyAuthError } from '#components/auth/auth-errors.js';
	import CodeStep from '#components/auth/CodeStep.svelte';
	import { formatPhone, isTurkishMobile, normalisePhone } from '#components/auth/phone.js';
	import { api } from '#lib/api.js';
	import { ensureExists } from '#lib/validation.js';
	import { turnstileStore } from '#stores/TurnstileStore.svelte.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createForm, Form } from '#ui/components/form/index.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';

	/**
	 * Add and verify a mobile number: asking, offering and buying need one. The one
	 * implementation behind `/auth/onboarding-phone`, the auth dialog's second step and the
	 * typeform auth step. The SMS code step takes the form's place.
	 */
	interface Props {
		onSuccess?: () => void;
		/** What stands above the field. Gives way to the code step. */
		header?: Snippet;
		/** The code step's heading level: `h1` on a page, `h2` inside a dialog. */
		headingTag?: 'h1' | 'h2';
	}

	let { onSuccess, header, headingTag = 'h2' }: Props = $props();

	let verificationToken = $state<string | undefined>(undefined);

	const form = createForm({
		fields: {
			mobileNumber: {
				label: 'Cep telefonu',
				placeholder: '05XX XXX XX XX',
				type: 'text' as const,
				inputmode: 'tel' as const,
				autocomplete: 'tel-national' as const,
				enterkeyhint: 'send' as const,
				hint: 'SMS ile 6 haneli bir kod göndereceğiz. Numaran başkalarına gösterilmez.',
				validation: [ensureExists, isTurkishMobile],
				value: ''
			}
		},
		// Runs when the field is left: a full number settles into `0532 123 45 67`.
		onChange: (key, value) => {
			if (key !== 'mobileNumber' || typeof value !== 'string') return;
			const formatted = formatPhone(value);
			if (formatted !== value) form.values.mobileNumber = formatted;
		},
		onSubmit: async (): Promise<void> => {
			try {
				await requestCode();
			} catch (e) {
				const code = exceptionCodeOf(e);
				if (code === ExceptionCodes.MOBILE_INVALID) {
					form.setFieldError('mobileNumber', 'Bu numara geçerli görünmüyor. Kontrol et.');
				} else if (code === ExceptionCodes.USER_ALREADY_EXISTS) {
					form.setFieldError('mobileNumber', 'Bu numara başka bir hesapta kayıtlı.');
				} else notifyAuthError(e);
			}
		}
	});

	// Also the code step's "send again": the same request re-sends the SMS.
	const requestCode = async () => {
		const res = await api.auth.changeMobileNumber(
			{ mobileNumber: normalisePhone(form.values.mobileNumber!) },
			await turnstileStore.getHeaders('change-mobile-number')
		);
		if (res?.verificationToken) verificationToken = res.verificationToken;
	};

	const verify = async (code: string) => {
		await api.auth.verifyChangeMobileNumber(
			{ token: verificationToken!, code },
			await turnstileStore.getHeaders('verify-change-mobile-number')
		);
		await userStore.refreshMe();
		notificationManager.addNotification({ title: 'Numaran doğrulandı', success: true });
		onSuccess?.();
	};
</script>

{#if verificationToken}
	<CodeStep
		channel="sms"
		destination={formatPhone(form.values.mobileNumber ?? '')}
		{headingTag}
		onVerify={verify}
		onResend={requestCode}
		onBack={() => (verificationToken = undefined)} />
{:else}
	{@render header?.()}
	<Form {form} submitText="Kod gönder" />
{/if}
