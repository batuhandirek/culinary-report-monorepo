<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#components/Logo.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	const notFound = $derived(page.status === 404);

	const copy = $derived(
		notFound
			? {
					title: 'Aradığın sayfa burada değil',
					body: 'Bağlantı eskimiş ya da adres yanlış yazılmış olabilir.'
				}
			: {
					title: 'Bir şeyler ters gitti',
					body: 'Sorun bizde, sende değil. Kaydettik, bakıyoruz — birazdan tekrar dene.'
				}
	);
</script>

<svelte:head>
	<title>{copy.title} | Culinary Report</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="narrow flex h-16 items-center">
		<Logo width={104} />
	</header>
	<!-- `data-sveltekit-reload` on the ways out: an error page can be the result of a broken
	     client state, so leaving it should start fresh. -->
	<main
		tabindex="-1"
		class="narrow flex flex-1 flex-col items-center justify-center py-14 text-center outline-none lg:py-20"
	>
		<!-- The status as a tilted pixel sticker. -->
		<span
			class="bg-ink text-sand font-pixel mb-7 inline-block -rotate-3 px-4 pb-2.5 pt-3.5 text-lg leading-none"
			aria-hidden="true"
		>
			{page.status}
		</span>
		<h1 class="text-ink m-0 text-2xl font-semibold lg:text-[2rem]">{copy.title}</h1>
		<p class="text-muted-foreground mb-0 mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed">
			{copy.body}
		</p>
		{#if !notFound && page.error?.debugId}
			<p class="font-term text-muted-foreground mb-0 mt-3 text-base leading-none">
				Hata kodu: <span class="select-all">{page.error.debugId}</span>
			</p>
		{/if}

		<div class="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
			{#if !notFound}
				<Button size="lg" onclick={() => location.reload()}>Tekrar dene</Button>
			{/if}
			<Button href="/" size="lg" variant="outline" data-sveltekit-reload>Ana sayfa</Button>
		</div>
	</main>
</div>
