<script module lang="ts">
	export interface ProtectedButtonProps
		extends Omit<WrappedButtonProps, 'href' | 'onclick'>, WithAuthOptions {
		href?: string;
		onclick?: () => void;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { isAuthed, withAuth, type WithAuthOptions } from '#components/auth/with-auth.js';
	import Button, { type WrappedButtonProps } from '#ui/wrapped/Button.svelte';

	/**
	 * A button whose action needs an account: a visitor gets the auth dialog first and the
	 * action runs once they are in. Give it `href` or `onclick`, never both.
	 */
	let {
		href,
		onclick,
		// The dialog's options, kept apart so they never reach the DOM as attributes.
		reason,
		defaultView,
		requireMobileNumberVerificationAsWell,
		children,
		...rest
	}: ProtectedButtonProps = $props();

	if (href && onclick) {
		throw new Error('ProtectedButton: provide either href or onclick, not both');
	}
	if (!href && !onclick) {
		throw new Error('ProtectedButton: href or onclick is required');
	}

	const authOptions = $derived({ reason, defaultView, requireMobileNumberVerificationAsWell });
	const authed = $derived(isAuthed(authOptions));

	const act = () => (href ? goto(href) : onclick?.());
</script>

<!-- A real link once the visitor is in (cmd-click, prefetch); a button until then. -->
{#if authed && href}
	<Button {...rest} {href}>
		{@render children?.()}
	</Button>
{:else}
	<Button {...rest} onclick={() => withAuth(act, authOptions)}>
		{@render children?.()}
	</Button>
{/if}
