<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#components/Logo.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? 'Link not found' : 'Something went wrong'} | Munchwerk</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="mx-auto flex h-16 w-full max-w-[56rem] items-center px-4">
		<Logo width={150} />
	</header>
	<main
		class="mx-auto flex max-w-[56rem] flex-1 flex-col items-center justify-center px-4 py-14 text-center">
		<span
			class="bg-ink text-acid number-hero tilt-left shadow-hard-acid mb-8 inline-block rounded-[12px] px-5 pt-3 pb-3.5 text-5xl"
			aria-hidden="true">
			{page.status}
		</span>
		{#if notFound}
			<h1 class="type-display text-ink m-0 text-3xl">
				This report link doesn't work any more
			</h1>
			<p
				class="text-muted-foreground mb-0 mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed">
				It was turned off, or the address got cut short when it was copied. Ask whoever sent
				it to you for a new one.
			</p>
		{:else}
			<h1 class="type-display text-ink m-0 text-3xl">The report didn't load</h1>
			<p
				class="text-muted-foreground mb-0 mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed">
				That one is on us. Try again in a moment.
			</p>
			<div class="mt-7">
				<Button size="lg" onclick={() => location.reload()}>Try again</Button>
			</div>
		{/if}
	</main>
</div>
