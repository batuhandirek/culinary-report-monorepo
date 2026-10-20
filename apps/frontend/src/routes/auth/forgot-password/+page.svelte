<script lang="ts">
	import { ExceptionCodes } from 'exceptions/src';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authHref } from '#components/auth/after-auth.js';
	import { exceptionCodeOf, notifyAuthError } from '#components/auth/auth-errors.js';
	import CodeStep from '#components/auth/CodeStep.svelte';
	import { api } from '#lib/api.js';
	import { ensureExists, isEmail, minLength } from '#lib/validation.js';
	import { turnstileStore } from '#stores/TurnstileStore.svelte.js';
	import { createForm, Form } from '#ui/components/form/index.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';

	const MIN_PASSWORD_LENGTH = 8;

	// Three steps on one page: the address, the code we send to it, the new password.
	// Each token is what the backend hands over for the next step.
	let codeToken = $state<string | undefined>(undefined);
	let passwordToken = $state<string | undefined>(undefined);

	const loginHref = $derived(authHref('/auth/login', page.url));

	const emailForm = createForm({
		fields: {
			email: {
				label: 'E-posta adresi',
				type: 'email' as const,
				placeholder: 'ornek@eposta.com',
				autocomplete: 'username' as const,
				enterkeyhint: 'send' as const,
				validation: [ensureExists, isEmail],
				value: ''
			}
		},
		onSubmit: async (): Promise<void> => {
			try {
				await requestCode();
			} catch (e) {
				if (exceptionCodeOf(e) === ExceptionCodes.USER_DOES_NOT_EXIST) {
					emailForm.setFieldError('email', 'Bu adresle bir hesap bulamadık.');
				} else notifyAuthError(e);
			}
		}
	});

	// Also the code step's "send again".
	const requestCode = async () => {
		const res = await api.auth.forgotPassword(
			{ email: emailForm.values.email! },
			await turnstileStore.getHeaders('forgot-password')
		);
		codeToken = res.verificationToken;
	};

	const verifyCode = async (code: string) => {
		const res = await api.auth.verifyForgotPassword(
			{ token: codeToken!, code },
			await turnstileStore.getHeaders('verify-forgot-password')
		);
		passwordToken = res.verificationToken;
		codeToken = undefined;
	};

	const passwordForm = createForm({
		fields: {
			password: {
				label: 'Yeni şifre',
				type: 'password' as const,
				autocomplete: 'new-password' as const,
				enterkeyhint: 'next' as const,
				hint: `En az ${MIN_PASSWORD_LENGTH} karakter.`,
				validation: [ensureExists, minLength(MIN_PASSWORD_LENGTH)],
				value: ''
			},
			passwordAgain: {
				label: 'Yeni şifre, tekrar',
				type: 'password' as const,
				autocomplete: 'new-password' as const,
				enterkeyhint: 'done' as const,
				validation: [
					ensureExists,
					// The explicit return type keeps this from typing `passwordForm` by itself.
					(again: string): true | string =>
						again === passwordForm.values.password ? true : 'İki şifre aynı değil.'
				],
				value: ''
			}
		},
		onSubmit: async (): Promise<void> => {
			try {
				await api.auth.changeForgottenPassword({
					password: passwordForm.values.password!,
					token: passwordToken!
				});
				notificationManager.addNotification({
					title: 'Şifren değişti',
					text: 'Yeni şifrenle giriş yapabilirsin.',
					success: true
				});
				goto(loginHref, { replace: true });
			} catch (e) {
				notifyAuthError(e);
			}
		}
	});
</script>

{#snippet backToLogin()}
	<p class="text-muted-foreground m-0 mt-6 text-center text-sm">
		Şifreni hatırladın mı?
		<a
			href={loginHref}
			data-sveltekit-replacestate
			class="text-ink decoration-line hover:decoration-ink font-semibold underline underline-offset-4">
			Girişe dön
		</a>
	</p>
{/snippet}

{#if passwordToken}
	<div class="mb-6 flex flex-col gap-1.5">
		<h1 class="type-title text-ink m-0 text-[1.75rem]">Yeni şifreni belirle</h1>
		<p class="text-muted-foreground m-0 text-[0.9375rem]">
			Bundan sonra bu şifreyle giriş yapacaksın.
		</p>
	</div>
	<Form form={passwordForm} submitText="Şifreyi kaydet" />
{:else if codeToken}
	<CodeStep
		channel="email"
		destination={emailForm.values.email ?? ''}
		headingTag="h1"
		onVerify={verifyCode}
		onResend={requestCode}
		onBack={() => (codeToken = undefined)} />
{:else}
	<div class="mb-6 flex flex-col gap-1.5">
		<h1 class="type-title text-ink m-0 text-[1.75rem]">Şifremi unuttum</h1>
		<p class="text-muted-foreground m-0 text-[0.9375rem]">
			Hesabının e-posta adresini yaz; şifreni sıfırlaman için bir kod gönderelim.
		</p>
	</div>
	<Form form={emailForm} submitText="Kod gönder" />
	{@render backToLogin()}
{/if}
