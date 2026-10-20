<script lang="ts">
	import Logo from '#components/Logo.svelte';
	import { userStore } from '#stores/UserStore.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
</script>

<!-- Placeholder home until the product has a landing page. -->
<div class="narrow flex min-h-dvh flex-col">
	<header class="flex h-16 items-center">
		<Logo width={120} />
	</header>
	<main class="flex flex-1 flex-col items-start justify-center gap-6 py-16">
		<span class="eyebrow text-beet">Restaurants · bars · cafés</span>
		<h1 class="type-hero text-ink m-0 max-w-[18ch] text-[2.75rem] leading-[1.05]">
			Know what people say about you.
		</h1>
		<p class="text-muted-foreground m-0 max-w-[52ch] text-[0.9375rem] leading-relaxed">
			A monthly report on your venue's TikTok, Instagram and Google reviews: what guests
			praised, what they complained about, and what changed.
		</p>
		<div class="flex flex-wrap gap-3">
			{#if userStore.isAdmin}
				<Button href="/admin" size="lg">Admin</Button>
			{:else if !userStore.isLoggedIn}
				<Button href="/auth/login" size="lg">Log in</Button>
				<Button href="/auth/signup" size="lg" variant="outline">Sign up</Button>
			{/if}
		</div>
	</main>
</div>
