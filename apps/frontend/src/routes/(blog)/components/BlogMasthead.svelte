<script lang="ts">
	import type { Snippet } from 'svelte';

	// The head of the blog index and of a topic page: what this page is, one sentence about
	// it, and the topic row. Deliberately image-free — the covers start right below it.
	let {
		eyebrow,
		title,
		description,
		children
	}: {
		/** Pixel label above the title ("Topic"); two to four words. */
		eyebrow?: string;
		title: string;
		description?: string;
		/** The topic row (`BlogTagNav`). */
		children?: Snippet;
	} = $props();
</script>

<section class="narrow pt-8 pb-6 md:pt-12 md:pb-8">
	{#if eyebrow}
		<div class="eyebrow text-beet mb-2">{eyebrow}</div>
	{/if}
	<h1
		class="type-title text-ink m-0 max-w-[24ch] text-3xl leading-tight text-balance md:text-[2.5rem]">
		{title}
	</h1>
	{#if description}
		<p class="text-muted-foreground mt-3 mb-0 max-w-[60ch] text-[0.9375rem] leading-relaxed">
			{description}
		</p>
	{/if}
	{#if children}
		<div class="mt-5">
			{@render children()}
		</div>
	{/if}
</section>
