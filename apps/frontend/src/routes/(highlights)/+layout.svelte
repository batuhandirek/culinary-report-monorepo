<script lang="ts">
	import HighlightsFooter from './components/HighlightsFooter.svelte';
	import HighlightsHeader from './components/HighlightsHeader.svelte';

	// The public city pages: light chrome like the blog's (wordmark home, a footer); each page
	// owns its width and ends on the pitch. Cookie consent comes from the root layout.
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
	<HighlightsHeader />
	<main id="content" tabindex="-1" class="flex-1 outline-none">
		{@render children?.()}
	</main>
	<HighlightsFooter />
</div>
