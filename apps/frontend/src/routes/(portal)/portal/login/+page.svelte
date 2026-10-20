<script lang="ts">
	import { untrack } from 'svelte';

	import { ExceptionCodes } from 'exceptions/src';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { safeRedirectPath } from '#components/auth/after-auth.js';
	import { exceptionCodeOf } from '#components/auth/auth-errors.js';
	import CodeStep from '#components/auth/CodeStep.svelte';
	import Logo from '#components/Logo.svelte';
	import { EMAIL_REGEX } from '#constants/REGEXES.js';
	import { isPortalPath } from '#lib/require-login.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createForm, Form } from '#ui/components/form/index.js';
	import Spinner from '#ui/components/Spinner.svelte';

	// Where to go once signed in: the portal page that sent them here, else the portal
	const target = $derived.by(() => {
		const redirect = safeRedirectPath(page.url.searchParams.get('redirect'));
		return redirect && isPortalPath(redirect) && !redirect.startsWith('/portal/login')
			? redirect
			: '/portal';
	});

	$effect(() => {
		if (!userStore.isLoggedIn) return;
		goto(
			untrack(() => target),
			{ replace: true }
		);
	});

	userStore.tryInitialiseStoreIfNotTriedBefore();

	let verificationToken = $state<string | undefined>(undefined);

	const form = createForm({
		fields: {
			email: {
				type: 'email' as const,
				label: 'E-mail address',
				placeholder: 'you@your-venue.de',
				autocomplete: 'username' as const,
				enterkeyhint: 'send' as const,
				validation: [
					(value: string) => (value ? true : 'Enter the address your invite went to'),
					(value: string) =>
						!value || EMAIL_REGEX.test(value) ? true : 'That does not look like an e-mail address'
				],
				// The invite's link carries the address
				value: page.url.searchParams.get('email') ?? ''
			}
		},
		onSubmit: async (): Promise<void> => {
			await sendCode();
		}
	});

	const requestCode = async () => {
		verificationToken = await userStore.requestLoginCode(form.values.email!.trim());
	};

	const sendCode = async () => {
		try {
			await requestCode();
		} catch (e) {
			switch (exceptionCodeOf(e)) {
				case ExceptionCodes.USER_DOES_NOT_EXIST:
					form.setFieldError(
						'email',
						"We don't know this address. Use the one your invite went to, or write to us."
					);
					break;
				case ExceptionCodes.TOO_MANY_VERIFICATION_REQUESTS:
					form.setFieldError(
						'email',
						'Too many codes asked for. Use the last one we sent, or try again in a while.'
					);
					break;
				case ExceptionCodes.TURNSTILE_VERIFICATION_FAILED:
					form.setFieldError('email', "We couldn't check that you're not a robot. Try again.");
					break;
				default:
					form.setFieldError('email', 'Something went wrong. Try again in a moment.');
			}
		}
	};

	const verify = async (code: string) => {
		await userStore.loginWithCode(verificationToken!, code);
	};
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-4 pt-safe pb-10">
	<header class="flex h-16 shrink-0 items-center">
		<Logo width={104} />
	</header>

	<main class="flex flex-1 flex-col justify-center pb-16">
		{#if !userStore.triedInitialising || userStore.isLoggedIn}
			<div class="text-muted-foreground flex justify-center py-16">
				<Spinner size={32} />
			</div>
		{:else}
			<div class="bg-paper border-line shadow-sticker rounded-md border px-5 py-7 sm:px-8">
				{#if verificationToken}
					<CodeStep
						lang="en"
						channel="email"
						destination={form.values.email ?? ''}
						headingTag="h1"
						onVerify={verify}
						onResend={requestCode}
						onBack={() => (verificationToken = undefined)} />
				{:else}
					<div class="mb-6 flex flex-col gap-2">
						<span class="eyebrow text-beet">Venue portal</span>
						<h1 class="type-title text-ink m-0 text-[1.75rem]">Sign in</h1>
						<p class="text-muted-foreground m-0 text-[0.9375rem]">
							Your monthly reports, the PDFs and how the numbers move. We e-mail you a
							six-digit code; there is no password.
						</p>
					</div>
					<Form {form} submitText="E-mail me a code" />
				{/if}
			</div>
			<p class="text-muted-foreground m-0 mt-6 text-center text-sm">
				No invite yet? Write to
				<a
					href="mailto:hello@culinaryreport.com"
					class="text-ink decoration-line hover:decoration-ink font-medium underline underline-offset-4"
					>hello@culinaryreport.com</a
				>.
			</p>
		{/if}
	</main>
</div>
