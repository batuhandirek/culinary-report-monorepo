<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#components/Logo.svelte';

	// The wordmark leads home; "Blog" leads back to the index from an article or a topic.
	let onIndex = $derived(page.url.pathname === '/blog');
</script>

<header class="border-line bg-paper border-b">
	<div class="narrow flex h-16 items-center justify-between gap-4">
		<Logo width={120} />
		<nav aria-label="Blog">
			<a
				href="/blog"
				aria-current={onIndex ? 'page' : undefined}
				class="eyebrow text-beet hover:text-ink inline-flex min-h-11 items-center">
				Blog
			</a>
		</nav>
	</div>
</header>
