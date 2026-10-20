<script lang="ts">
	import { untrack } from 'svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { afterAuthPath, authHref, leaveAuthPath } from '#components/auth/after-auth.js';
	import PhoneForm from '#components/auth/PhoneForm.svelte';
	import { userStore } from '#stores/UserStore.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';

	// Only someone logged in has a number to add; and once it is verified (here, or it
	// already was) there is nothing left to do on this page.
	$effect(() => {
		if (userStore.isLoggedOut) {
			goto(
				untrack(() => authHref('/auth/login', page.url)),
				{ replace: true }
			);
		} else if (userStore.hasMobileNumber) {
			goto(
				untrack(() => afterAuthPath(page.url, '/')),
				{ replace: true }
			);
		}
	});
</script>

{#snippet header()}
	<div class="mb-6 flex flex-col gap-1.5">
		<h1 class="type-title text-ink m-0 text-[1.75rem]">Telefon numaranı ekle</h1>
		<p class="text-muted-foreground m-0 text-[0.9375rem]">
			Soru sormak, teklif vermek ve satın almak için doğrulanmış bir telefon numarası
			gerekiyor.
		</p>
	</div>
{/snippet}

{#if userStore.isLoggedIn && !userStore.hasMobileNumber}
	<PhoneForm {header} headingTag="h1" />
	<Button
		variant="link"
		class="mt-3 h-11 self-center"
		onclick={() => goto(leaveAuthPath(page.url), { replace: true })}>
		Şimdilik geç
	</Button>
{/if}
