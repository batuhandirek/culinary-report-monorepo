<script lang="ts">
	import { ExceptionCodes } from 'exceptions/src';
	import type { Snippet } from 'svelte';

	import { exceptionCodeOf, notifyAuthError } from '#components/auth/auth-errors.js';
	import CodeStep from '#components/auth/CodeStep.svelte';
	import { PUBLIC_APP_URL } from '$app/env/public';
	import { MARKETING_CONSENT_TEXT } from '#constants/CONSENT_TEXTS.js';
	import { api } from '#lib/api.js';
	import { ensureExists, isEmail, minLength } from '#lib/validation.js';
	import { turnstileStore } from '#stores/TurnstileStore.svelte.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createForm, Form } from '#ui/components/form/index.js';

	/**
	 * Sign up with e-mail, or with Google/Apple. The one implementation behind the signup
	 * page, the auth dialog and the typeform auth step. The e-mail is confirmed with a code
	 * before the account exists; the code step takes the form's place.
	 */
	interface Props {
		onSuccess?: () => void;
		/** What stands above the fields (the page's heading, the dialog's tabs). Gives way to the code step. */
		header?: Snippet;
		/** The code step's heading level: `h1` on a page, `h2` inside a dialog. */
		headingTag?: 'h1' | 'h2';
		/** The way to login on a page; the dialog switches with its tabs instead. */
		loginHref?: string;
	}

	let { onSuccess, header, headingTag = 'h2', loginHref }: Props = $props();

	const MIN_PASSWORD_LENGTH = 8;

	// The legal pages open beside the form, not instead of it: half-typed fields survive.
	// An absolute address is another host inside the app's WebView, so it leaves for the
	// system browser there rather than reloading the SPA.
	const legalLink = (path: string, text: string) =>
		`<a href="${PUBLIC_APP_URL}${path}" target="_blank" rel="noopener" class="text-ink decoration-line hover:decoration-ink font-semibold underline underline-offset-2">${text}</a>`;

	let verificationToken = $state<string | undefined>(undefined);

	const form = createForm({
		fields: {
			firstName: {
				label: 'Ad',
				type: 'text' as const,
				autocomplete: 'given-name' as const,
				autocapitalize: 'words' as const,
				validation: [ensureExists, minLength(2)],
				col: 6,
				value: ''
			},
			lastName: {
				label: 'Soyad',
				type: 'text' as const,
				autocomplete: 'family-name' as const,
				autocapitalize: 'words' as const,
				validation: [ensureExists, minLength(2)],
				col: 6,
				value: ''
			},
			email: {
				label: 'E-posta adresi',
				type: 'email' as const,
				placeholder: 'ornek@eposta.com',
				autocomplete: 'email' as const,
				hint: 'Doğrulamak için bu adrese bir kod göndereceğiz.',
				validation: [ensureExists, isEmail],
				value: ''
			},
			password: {
				label: 'Şifre',
				type: 'password' as const,
				autocomplete: 'new-password' as const,
				hint: `En az ${MIN_PASSWORD_LENGTH} karakter.`,
				validation: [ensureExists, minLength(MIN_PASSWORD_LENGTH)],
				value: ''
			},
			acceptedTerms: {
				type: 'checkbox' as const,
				message: `<span class="text-xs">${legalLink('/legal/hesap-sozlesmesi', 'Kullanıcı Sözleşmesi ve Ekleri')}'ni okudum ve kabul ediyorum</span>`,
				validation: [
					(accepted: boolean) =>
						accepted ? true : 'Üye olmak için sözleşmeyi kabul etmen gerekiyor.'
				],
				value: false
			},
			acceptedMarketing: {
				type: 'checkbox' as const,
				message: `<span class="text-xs">${MARKETING_CONSENT_TEXT}</span>`,
				value: false
			}
		},
		onSubmit: async (): Promise<void> => {
			try {
				await requestCode();
			} catch (e) {
				if (exceptionCodeOf(e) === ExceptionCodes.USER_ALREADY_EXISTS) {
					form.setFieldError(
						'email',
						'Bu adresle bir hesap var. Giriş yap ya da şifreni sıfırla.'
					);
				} else notifyAuthError(e);
			}
		}
	});

	// Also the code step's "send again": the same request re-sends the code.
	const requestCode = async () => {
		const res = await api.auth.signupWithEmail(
			{
				firstName: form.values.firstName!.trim(),
				lastName: form.values.lastName!.trim(),
				email: form.values.email!,
				password: form.values.password!,
				acceptedTerms: form.values.acceptedTerms!,
				acceptedMarketing: form.values.acceptedMarketing!
			},
			await turnstileStore.getHeaders('signup')
		);
		verificationToken = res.verificationToken;
	};

	const verify = async (code: string) => {
		await api.auth.verifySignup(
			{ token: verificationToken!, code },
			await turnstileStore.getHeaders('verify-signup')
		);
		await userStore.loginWithEmail(form.values.email!, form.values.password!);
		onSuccess?.();
	};
</script>

{#if verificationToken}
	<CodeStep
		channel="email"
		destination={form.values.email ?? ''}
		{headingTag}
		onVerify={verify}
		onResend={requestCode}
		onBack={() => (verificationToken = undefined)} />
{:else}
	{@render header?.()}

	<Form {form} class="gap-x-3" submitText="Üye ol">
		{#snippet foot()}
			<p class="text-muted-foreground m-0 text-xs">
				Kişisel verilerini nasıl işlediğimizi
				<!-- eslint-disable-next-line svelte/no-at-html-tags (our own static link) -->
				{@html legalLink(
					'/legal/kisisel-verilerin-korunmasi-ve-islenmesi-hakkinda-bilgilendirme',
					'Aydınlatma Metni'
				)}'nde anlatıyoruz.
			</p>
		{/snippet}
	</Form>

	{#if loginHref}
		<p class="text-muted-foreground m-0 mt-6 text-center text-sm">
			Zaten üye misin?
			<a
				href={loginHref}
				data-sveltekit-replacestate
				class="text-ink decoration-line hover:decoration-ink font-semibold underline underline-offset-4">
				Giriş yap
			</a>
		</p>
	{/if}
{/if}
