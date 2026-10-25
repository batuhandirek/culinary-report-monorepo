<script lang="ts">
	import Logo from '#components/Logo.svelte';
</script>

<header class="border-ink bg-paper border-b-2">
	<div class="mx-auto flex h-16 w-full max-w-[60rem] items-center justify-between gap-4 px-4">
		<Logo width={170} />
		<nav aria-label="Site">
			<a href="/blog" class="stamp text-ink hover:text-grape inline-flex min-h-11 items-center">Blog</a>
		</nav>
	</div>
</header>
