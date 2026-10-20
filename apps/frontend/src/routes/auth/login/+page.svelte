<script lang="ts">
	import { untrack } from 'svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { afterAuthPath, authHref, authReason } from '#components/auth/after-auth.js';
	import LoginForm from '#components/auth/LoginForm.svelte';
	import { userStore } from '#stores/UserStore.svelte.js';

	// Once the session opens: back to the page that sent them here, else home.
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
		<h1 class="type-title text-ink m-0 text-[1.75rem]">Giriş yap</h1>
		<p class="text-muted-foreground m-0 text-[0.9375rem]">
			{authReason(page.url, 'login') ?? 'Tekrar hoş geldin.'}
		</p>
	</div>
{/snippet}

<LoginForm
	{header}
	headingTag="h1"
	signupHref={authHref('/auth/signup', page.url)}
	forgotPasswordHref={authHref('/auth/forgot-password', page.url)} />
