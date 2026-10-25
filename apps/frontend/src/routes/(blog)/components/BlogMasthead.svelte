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
		/** Stamp above the title ("Topic"); one or two words. */
		eyebrow?: string;
		title: string;
		description?: string;
		/** The topic row (`BlogTagNav`). */
		children?: Snippet;
	} = $props();
</script>

<section class="narrow pt-8 pb-6 md:pt-12 md:pb-8">
	{#if eyebrow}
		<div class="stamp text-beet mb-3">{eyebrow}</div>
	{/if}
	<h1
		class="type-hero text-ink m-0 max-w-[20ch] text-[2.5rem] text-balance md:text-6xl">
		{title}
	</h1>
	{#if description}
		<p class="text-muted-foreground mt-4 mb-0 max-w-[60ch] text-base leading-relaxed md:text-lg">
			{description}
		</p>
	{/if}
	{#if children}
		<div class="mt-5">
			{@render children()}
		</div>
	{/if}
</section>
