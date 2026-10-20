<script lang="ts">
	import LoginForm from '#components/auth/LoginForm.svelte';
	import PhoneForm from '#components/auth/PhoneForm.svelte';
	import SignupForm from '#components/auth/SignupForm.svelte';
	import { userStore } from '#stores/UserStore.svelte.js';
	import * as Tabs from '#ui/primitives-new/tabs/index.js';
	import ResponsiveModal from '#ui/wrapped/ResponsiveModal.svelte';

	/**
	 * Login / signup opened over the page someone is on, by an action that needs an
	 * account (`withAuth`). Same forms as the auth pages; `reason` says why it appeared.
	 */
	export interface AuthDialogProps {
		active?: boolean;
		onSuccess?: () => void;
		onCancel?: () => void;
		/** Also ask for a verified mobile number before the action goes ahead. */
		requireMobileNumberVerificationAsWell?: boolean;
		defaultView?: 'login' | 'signup';
		/** One sentence, e.g. "Teklif vermek için giriş yap". */
		reason?: string;
	}

	type View = 'login' | 'signup';

	let {
		active = $bindable(false),
		defaultView = 'login',
		requireMobileNumberVerificationAsWell = false,
		onSuccess,
		onCancel,
		reason
	}: AuthDialogProps = $props();

	let view = $state<View>(defaultView);

	// Logging in happens in more than one place (the form, Google's popup, Apple's sheet),
	// so the dialog watches the session rather than each of them.
	const needsPhone = $derived(
		userStore.isLoggedIn && requireMobileNumberVerificationAsWell && !userStore.hasMobileNumber
	);
	const done = $derived(userStore.isLoggedIn && !needsPhone);

	$effect(() => {
		if (!active || !done) return;
		active = false;
		onSuccess?.();
	});

	const title = $derived(
		needsPhone ? 'Telefon numaranı doğrula' : view === 'login' ? 'Giriş yap' : 'Üye ol'
	);
	const description = $derived(
		needsPhone
			? 'Soru sormak, teklif vermek ve satın almak için doğrulanmış bir telefon numarası gerekiyor.'
			: (reason ?? (view === 'login' ? 'Tekrar hoş geldin.' : 'Üyelik ücretsiz, bir dakika sürer.'))
	);
</script>

{#snippet tabs()}
	<Tabs.Root value={view} onValueChange={(value) => (view = value as View)} class="mb-5">
		<Tabs.List class="w-full">
			<Tabs.Trigger value="login" class="flex-1">Giriş yap</Tabs.Trigger>
			<Tabs.Trigger value="signup" class="flex-1">Üye ol</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>
{/snippet}

<ResponsiveModal
	bind:open={active}
	{title}
	{description}
	onOpenChange={(open) => {
		if (!open) onCancel?.();
	}}>
	<!-- One child, so the modal's own gap does not add to the forms' spacing. Actions stay
	     in the scrolling body: a pinned footer plus the keyboard leaves no room for a field. -->
	<div class="flex flex-col">
		{#if needsPhone}
			<PhoneForm />
		{:else if view === 'login'}
			<LoginForm header={tabs} />
		{:else}
			<SignupForm header={tabs} />
		{/if}
	</div>
</ResponsiveModal>
