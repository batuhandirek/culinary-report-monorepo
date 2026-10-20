<script lang="ts">
	import { onMount } from 'svelte';

	import { codeErrorText } from '#components/auth/auth-errors.js';
	import Button from '#ui/wrapped/Button.svelte';
	import PinInput from '#ui/wrapped/PinInput.svelte';

	/**
	 * The second half of every auth form: the six-digit code we just sent. It takes the
	 * form's place (on the page or in the dialog) instead of opening a dialog over it.
	 * `onVerify` and `onResend` are the bare API calls — a refusal is said under the cells,
	 * where the person is looking, not in a toast.
	 */
	interface Props {
		channel: 'email' | 'sms';
		/** Where the code went, as the person typed it. */
		destination: string;
		/** The page's main heading on an auth page, a section heading inside a dialog. */
		headingTag?: 'h1' | 'h2';
		/** Runs with the six digits; let the API's error through to refuse the code. */
		onVerify: (code: string) => Promise<unknown>;
		/** Asks for a code again. The backend re-sends at most once a minute. */
		onResend: () => Promise<unknown>;
		/** Back to the form, to fix the address or the number. */
		onBack: () => void;
		/** The words: Turkish for the app, English for the venue portal. */
		lang?: 'tr' | 'en';
	}

	let {
		channel,
		destination,
		headingTag = 'h2',
		onVerify,
		onResend,
		onBack,
		lang = 'tr'
	}: Props = $props();

	const CODE_LENGTH = 6;
	// The backend's own cooldown: a request inside it returns the code already on its way.
	const RESEND_AFTER_SECONDS = 60;

	const COPY = {
		tr: {
			sent: 'Yeni bir kod gönderdik.',
			title: (email: boolean) =>
				email ? 'E-postana bir kod gönderdik' : 'Telefonuna bir kod gönderdik',
			lead: (email: boolean) =>
				`${email ? 'adresine' : 'numarasına'} gelen ${CODE_LENGTH} haneli kodu gir.`,
			spam: 'Gelmediyse gereksiz (spam) klasörüne de bak.',
			verify: 'Doğrula',
			back: (email: boolean) => (email ? 'E-posta adresini değiştir' : 'Numarayı değiştir'),
			resendIn: 'Tekrar gönder',
			resend: 'Kodu tekrar gönder'
		},
		en: {
			sent: 'We sent a new code.',
			title: (email: boolean) => (email ? 'Check your e-mail' : 'Check your phone'),
			lead: () => `Type the ${CODE_LENGTH}-digit code we just sent there.`,
			spam: "Nothing yet? Look in your spam folder too.",
			verify: 'Sign in',
			back: (email: boolean) => (email ? 'Use another address' : 'Use another number'),
			resendIn: 'Send again',
			resend: 'Send the code again'
		}
	};
	const copy = $derived(COPY[lang]);
	const isEmail = $derived(channel === 'email');

	let code = $state('');
	let verifying = $state(false);
	let resending = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let secondsLeft = $state(RESEND_AFTER_SECONDS);

	const countdown = $derived(
		`${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
	);

	onMount(() => {
		const timer = setInterval(() => {
			if (secondsLeft > 0) secondsLeft -= 1;
		}, 1000);
		return () => clearInterval(timer);
	});

	const verify = async () => {
		if (verifying || code.length !== CODE_LENGTH) return;
		verifying = true;
		error = null;
		notice = null;
		try {
			await onVerify(code);
		} catch (e) {
			error = codeErrorText(e, lang);
			// Empty cells with the caret still in them: the next attempt is just typing.
			code = '';
		} finally {
			verifying = false;
		}
	};

	const resend = async () => {
		if (resending || secondsLeft > 0) return;
		resending = true;
		error = null;
		try {
			await onResend();
			code = '';
			secondsLeft = RESEND_AFTER_SECONDS;
			notice = copy.sent;
		} catch (e) {
			error = codeErrorText(e, lang);
		} finally {
			resending = false;
		}
	};
</script>

<form
	class="flex w-full flex-col gap-5"
	novalidate
	onsubmit={(e) => {
		e.preventDefault();
		verify();
	}}>
	<div class="flex flex-col gap-1.5">
		<svelte:element this={headingTag} class="type-title text-ink m-0 text-[1.375rem]">
			{copy.title(isEmail)}
		</svelte:element>
		<p class="text-muted-foreground m-0 text-[0.9375rem]">
			<span class="text-ink font-medium break-all">{destination}</span>
			{copy.lead(isEmail)}
		</p>
	</div>

	<div class="flex flex-col gap-2">
		<PinInput
			bind:value={
				() => code,
				(typed) => {
					code = typed;
					if (typed) error = null;
				}
			}
			maxlength={CODE_LENGTH}
			invalid={!!error}
			onComplete={verify} />
		{#if error}
			<p role="alert" class="text-destructive m-0 text-xs font-semibold">{error}</p>
		{:else if notice}
			<p role="status" class="text-muted-foreground m-0 text-sm">{notice}</p>
		{:else if channel === 'email'}
			<p class="text-muted-foreground m-0 text-sm">{copy.spam}</p>
		{/if}
	</div>

	<Button type="submit" class="w-full" loading={verifying} disabled={code.length !== CODE_LENGTH}>
		{copy.verify}
	</Button>

	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
		<Button variant="link" class="h-11 px-0" onclick={onBack}>
			{copy.back(isEmail)}
		</Button>
		{#if secondsLeft > 0}
			<span class="text-muted-foreground type-meta text-sm">
				{copy.resendIn} · {countdown}
			</span>
		{:else}
			<Button variant="link" class="h-11 px-0" loading={resending} onclick={resend}>
				{copy.resend}
			</Button>
		{/if}
	</div>
</form>
