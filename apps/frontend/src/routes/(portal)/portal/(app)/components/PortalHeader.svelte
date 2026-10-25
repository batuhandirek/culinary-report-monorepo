<script lang="ts">
	import { LogOut, Shield } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import Logo from '#components/Logo.svelte';
	import { userStore } from '#stores/UserStore.svelte.js';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	// The portal's top bar: the wordmark, what the page adds (the venue switcher), a way back
	// to the admin for an admin, and signing out. No admin chrome.
	let { children }: { children?: Snippet } = $props();
</script>

<header class="pt-safe mx-auto flex w-full max-w-[56rem] items-center gap-3 px-4">
	<div class="flex h-16 shrink-0 items-center">
		<Logo width={140} />
	</div>
	<div class="flex min-w-0 flex-1 items-center justify-end gap-1">
		{@render children?.()}
		{#if userStore.isAdmin}
			<IconButton icon={Shield} label="Back to the admin" variant="ghost" href="/admin/brands?segment=customers" />
		{/if}
		<IconButton icon={LogOut} label="Sign out" variant="ghost" onclick={() => userStore.logout()} />
	</div>
</header>
