<script lang="ts">
	import '../../blog.css';

	import { ShieldAlert } from '@lucide/svelte';

	import { onMount, type Snippet } from 'svelte';

	import AdminSidebar from './components/AdminSidebar.svelte';
	import AdminTopBar from './components/AdminTopBar.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { loginHref } from '#lib/require-login.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import Spinner from '#ui/components/Spinner.svelte';
	import { setUiLabels } from '#ui/lib/ui-labels.js';
	import { Button } from '#ui/primitives-new/button/index.js';

	let { children }: { children?: Snippet } = $props();

	// The UI kit and its fixture pages sit in this layout but show the storefront's own
	// components, which are Turkish: there the page keeps the storefront's language and
	// words, and only the frame around it (sidebar, top bar) is English.
	const storefront = $derived(page.url.pathname.startsWith('/admin/ui-kit'));

	// Admin is in English. The document says so while it is mounted, or the storefront's
	// `lang="tr"` uppercases every pixel label with a dotted İ ("ADMİN") — in portals too.
	let storefrontLang = $state('tr');
	onMount(() => {
		storefrontLang = document.documentElement.lang || 'tr';
		return () => (document.documentElement.lang = storefrontLang);
	});
	$effect(() => {
		document.documentElement.lang = storefront ? storefrontLang : 'en';
	});
	// …and so do the design system's fallback words: a dialog nobody labelled says
	// "Cancel", not "Vazgeç".
	setUiLabels(() =>
		storefront
			? {}
			: {
					submit: 'Save',
					cancel: 'Cancel',
					confirm: 'Confirm',
					optional: 'optional',
					close: 'Close',
					loadFailed: 'Something went wrong',
					retry: 'Try again',
					retryHint: 'Check your connection and try again.',
					loading: 'Loading',
					previous: 'Previous',
					next: 'Next',
					previousPage: 'Previous page',
					nextPage: 'Next page',
					more: 'More'
				}
	);

	let triedLoggingIn = $state(false);
	onMount(async () => {
		await userStore.tryInitialiseStore();
		triedLoggingIn = true;
		if (!userStore.isLoggedIn) {
			// Come back to the page that was asked for, not to the overview.
			goto(loginHref(page.url.pathname + page.url.search), { replace: true });
		}
	});
</script>

<div class="bg-sand checker flex h-dvh overflow-hidden" lang="en">
	{#if !triedLoggingIn}
		<div class="flex flex-1 flex-col items-center justify-center gap-3">
			<Spinner size={32} />
			<span class="text-muted-foreground text-sm">Checking your session…</span>
		</div>
	{:else if userStore.isAdmin}
		<AdminSidebar />
		<main class="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
			<AdminTopBar />
			<!-- A page either scrolls here, or (a list) fills this box and scrolls its table. -->
			<div
				class="px-device min-h-0 flex-1 overflow-auto pt-4"
				lang={storefront ? storefrontLang : undefined}>
				{@render children?.()}
			</div>
		</main>
	{:else if userStore.isLoggedIn}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
			<span class="bg-paper border-line grid size-12 place-items-center rounded-full border">
				<ShieldAlert class="size-6" />
			</span>
			<div>
				<h1 class="m-0 text-lg font-semibold">This area is for admins</h1>
				<p class="text-muted-foreground m-0 mt-1 text-sm">
					Your account doesn't have the admin role.
				</p>
			</div>
			<Button variant="outline" href="/">Return to the app</Button>
		</div>
	{/if}
</div>
