<script lang="ts">
	import '../app.css';
	import '../media.css';

	import { deepMerge, JsonLd, MetaTags } from 'svelte-meta-tags';

	import { onMount } from 'svelte';

	import CookieBanner from './components/CookieBanner.svelte';
	import CookieManagementDialog from './components/CookieManagementDialog.svelte';
	import NavigationProgress from './components/NavigationProgress.svelte';

	import { page } from '$app/state';
	import { authDialogManager } from '#components/auth/auth-dialog-manager.svelte.js';
	import AuthDialog from '#components/auth/AuthDialog.svelte';
	import TurnstileHost from '#components/TurnstileHost.svelte';
	import { BASE_META_TAGS } from '#constants/BASE_META_TAGS.js';
	import { analyticsStore } from '#stores/AnalyticsStore.svelte.js';
	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import Setup from '#ui/components/Setup.svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let metaTags = $derived(deepMerge(BASE_META_TAGS, page.data.pageMetaTags ?? {}));

	// A phone in the middle of a form (signing up) has no room for the cookie card: it
	// would sit on the submit button. It waits for the next page — until someone answers,
	// only the necessary cookies are in use anyway.
	const FOCUSED_FLOWS = ['/auth'];
	const cookieCardWaits = $derived(
		layoutStore.touch && FOCUSED_FLOWS.some((path) => page.url.pathname.startsWith(path))
	);

	// Pages a headless browser prints (`/print/*`) carry no consent card: there is no one to answer it
	const printing = $derived(page.url.pathname.startsWith('/print/'));

	// `app.html` marks a document that holds a stored session so the headers do not flash
	// the visitor's buttons; once the session check has an answer the mark has done its job.
	$effect(() => {
		if (userStore.triedInitialising) delete document.documentElement.dataset.session;
	});

	onMount(async () => {
		await userStore.tryInitialiseStore();
		analyticsStore.initialize();
	});
</script>

<JsonLd
	schema={[
		{
			'@type': 'Organization',
			name: 'Culinary Report',
			url: 'https://culinaryreport.com',
			description:
				'Monthly reports on what social media says about your restaurant, bar or café.'
		},
		{
			'@type': 'WebSite',
			name: 'Culinary Report',
			url: 'https://culinaryreport.com',
			description:
				'Monthly reports on what social media says about your restaurant, bar or café.'
		}
	]} />

<MetaTags {...metaTags} />
{#if authDialogManager.showingProps}
	<AuthDialog {...authDialogManager.showingProps} active />
{/if}
<Setup />
<NavigationProgress />
{@render children?.()}
<TurnstileHost />
<!-- Cookie consent is site-wide (every route group), so it lives in the root layout. The
     banner also self-gates on analytics init, so it never renders during SSR/boot. -->
{#if analyticsStore.isInitialized && !analyticsStore.hasBeenAskedBefore && !cookieCardWaits && !printing}
	<CookieBanner />
{/if}
<CookieManagementDialog bind:active={analyticsStore.isDialogVisible} />
