<script lang="ts">
	import { ExceptionCodes } from 'exceptions/src';
	import type { Snippet } from 'svelte';

	import { exceptionCodeOf, notifyAuthError } from '#components/auth/auth-errors.js';
	import CodeStep from '#components/auth/CodeStep.svelte';
	import { api } from '#lib/api.js';
	import { ensureExists, isEmail } from '#lib/validation.js';
	import { turnstileStore } from '#stores/TurnstileStore.svelte.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createForm, Form } from '#ui/components/form/index.js';

	/**
	 * Log in with e-mail and password, or with Google/Apple. The one implementation behind
	 * the login page, the auth dialog and the typeform auth step. An account whose e-mail
	 * was never verified is handed straight to the code step.
	 */
	interface Props {
		onSuccess?: () => void;
		/** What stands above the fields (the page's heading, the dialog's tabs). Gives way to the code step. */
		header?: Snippet;
		/** The code step's heading level: `h1` on a page, `h2` inside a dialog. */
		headingTag?: 'h1' | 'h2';
		/** The way to signup on a page; the dialog switches with its tabs instead. */
		signupHref?: string;
		forgotPasswordHref?: string;
	}

	let {
		onSuccess,
		header,
		headingTag = 'h2',
		signupHref,
		forgotPasswordHref = '/auth/forgot-password'
	}: Props = $props();

	let verificationToken = $state<string | undefined>(undefined);

	const form = createForm({
		fields: {
			email: {
				type: 'email' as const,
				label: 'E-posta adresi',
				placeholder: 'ornek@eposta.com',
				autocomplete: 'username' as const,
				enterkeyhint: 'next' as const,
				validation: [ensureExists, isEmail],
				value: ''
			},
			password: {
				type: 'password' as const,
				label: 'Şifre',
				placeholder: 'Şifren',
				autocomplete: 'current-password' as const,
				enterkeyhint: 'go' as const,
				validation: [ensureExists],
				value: ''
			}
		},
		onSubmit: async (): Promise<void> => {
			await login();
		}
	});

	// Shared by the first attempt, the code step's "send again" and the login that
	// follows a verified code. Errors travel to whoever called.
	const requestLogin = async () => {
		const res = await userStore.loginWithEmail(form.values.email!, form.values.password!);
		if ('verificationToken' in res) verificationToken = res.verificationToken;
		else onSuccess?.();
	};

	const login = async () => {
		try {
			await requestLogin();
		} catch (e) {
			const code = exceptionCodeOf(e);
			if (code === ExceptionCodes.INVALID_CREDENTIALS) {
				form.setFieldError('password', 'E-posta adresi ya da şifre yanlış.');
			} else if (code === ExceptionCodes.USER_HAS_NO_PASSWORD) {
				form.setFieldError(
					'password',
					'Bu hesabın şifresi yok. Google ya da Apple ile giriş yap.'
				);
			} else notifyAuthError(e);
		}
	};

	const verify = async (code: string) => {
		await api.auth.verifySignup(
			{ token: verificationToken!, code },
			await turnstileStore.getHeaders('verify-signup')
		);
		await requestLogin();
	};
</script>

{#if verificationToken}
	<CodeStep
		channel="email"
		destination={form.values.email ?? ''}
		{headingTag}
		onVerify={verify}
		onResend={requestLogin}
		onBack={() => (verificationToken = undefined)} />
{:else}
	{@render header?.()}

	<Form {form} submitText="Giriş yap">
		{#snippet foot()}
			<div class="-my-2 flex justify-end">
				<a
					href={forgotPasswordHref}
					class="text-ink decoration-line hover:decoration-ink inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
					Şifremi unuttum
				</a>
			</div>
		{/snippet}
	</Form>

	{#if signupHref}
		<p class="text-muted-foreground m-0 mt-6 text-center text-sm">
			Hesabın yok mu?
			<a
				href={signupHref}
				data-sveltekit-replacestate
				class="text-ink decoration-line hover:decoration-ink font-semibold underline underline-offset-4">
				Üye ol
			</a>
		</p>
	{/if}
{/if}
