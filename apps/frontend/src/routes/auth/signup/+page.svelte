<script lang="ts">
	import { untrack } from 'svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { afterAuthPath, authHref, authReason } from '#components/auth/after-auth.js';
	import SignupForm from '#components/auth/SignupForm.svelte';
	import { userStore } from '#stores/UserStore.svelte.js';

	// Watches the session rather than the form: Google and Apple sign up outside it.
	$effect(() => {
		if (!userStore.isLoggedIn) return;
		goto(
			untrack(() => afterAuthPath(page.url, '/')),
			{ replace: true }
		);
	});
</script>

{#snippet header()}
	<div class="mb-6 flex flex-col gap-1.5">
		<h1 class="type-title text-ink m-0 text-[1.75rem]">Üye ol</h1>
		<p class="text-muted-foreground m-0 text-[0.9375rem]">
			{authReason(page.url, 'signup') ?? 'Üyelik ücretsiz, bir dakika sürer.'}
		</p>
	</div>
{/snippet}

<SignupForm {header} headingTag="h1" loginHref={authHref('/auth/login', page.url)} />
