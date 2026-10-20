<script lang="ts">
	import { onMount } from 'svelte';

	import { turnstileStore } from '#stores/TurnstileStore.svelte.js';

	let container = $state<HTMLDivElement>();

	onMount(() => {
		if (!turnstileStore.isEnabled || !container) return;
		turnstileStore.registerContainer(container);
		return () => turnstileStore.unregisterContainer();
	});
</script>

{#if turnstileStore.isEnabled}
	<!-- The Turnstile widget lives here permanently (interaction-only appearance keeps it
	     invisible). The scrim and the card around it only show, and only block, while
	     Cloudflare needs the visitor to tick its box — and say why something popped up
	     over the form they just sent. -->
	<div
		role={turnstileStore.interactive ? 'alertdialog' : undefined}
		aria-modal={turnstileStore.interactive ? 'true' : undefined}
		aria-labelledby={turnstileStore.interactive ? 'turnstile-title' : undefined}
		aria-hidden={turnstileStore.interactive ? undefined : 'true'}
		class={[
			'bg-ink/50 fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-opacity duration-200',
			turnstileStore.interactive ? 'opacity-100' : 'pointer-events-none opacity-0'
		]}>
		<div
			class="bg-paper border-line flex max-w-sm flex-col items-center gap-4 rounded-md border p-6 text-center shadow-lg">
			<div class="flex flex-col gap-1">
				<p id="turnstile-title" class="type-title text-ink m-0 text-lg">Bir saniye</p>
				<p class="text-muted-foreground m-0 text-sm">
					Robot olmadığından emin olmamız gerekiyor. Aşağıdaki kutuyu işaretle, kaldığın
					yerden devam edelim.
				</p>
			</div>
			<div bind:this={container}></div>
		</div>
	</div>
{/if}
