<script lang="ts">
	import '../../blog.css';

	import BlogFooter from './components/BlogFooter.svelte';
	import BlogHeader from './components/BlogHeader.svelte';

	// The blog is its own route group (SSR on in +layout.ts) with its own light chrome: the
	// wordmark home, the way back to the index and a footer. Cookie consent comes from the
	// root layout. Pages own their content width via the `.narrow` container, and each one
	// ends on `BlogPitchBand` — the reader's way to the report.
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<a
		href="#content"
		class="bg-ink text-sand sr-only z-50 rounded-md px-4 py-3 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
		Skip to content
	</a>
	<BlogHeader />
	<main id="content" tabindex="-1" class="flex-1 outline-none">
		{@render children?.()}
	</main>
	<BlogFooter />
</div>
