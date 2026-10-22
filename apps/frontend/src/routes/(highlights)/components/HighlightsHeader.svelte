<script lang="ts">
	import Logo from '#components/Logo.svelte';
</script>

<header class="border-line bg-paper border-b">
	<div class="mx-auto flex h-16 w-full max-w-[60rem] items-center justify-between gap-4 px-4">
		<Logo width={120} />
		<nav aria-label="Site">
			<a href="/blog" class="eyebrow text-beet hover:text-ink inline-flex min-h-11 items-center">Blog</a>
		</nav>
	</div>
</header>
