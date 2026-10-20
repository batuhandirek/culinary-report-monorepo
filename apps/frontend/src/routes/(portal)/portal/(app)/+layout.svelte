<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requireLogin } from '#lib/require-login.js';
	import Spinner from '#ui/components/Spinner.svelte';

	let { children }: { children?: Snippet } = $props();

	// Every portal page needs the session: a visitor goes to `/portal/login` and comes back.
	let ready = $state(false);
	onMount(async () => {
		ready = await requireLogin();
	});
</script>

{#if ready}
	{@render children?.()}
{:else}
	<div class="text-muted-foreground flex min-h-dvh items-center justify-center">
		<Spinner size={32} />
	</div>
{/if}
