<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** The anchor the page nav scrolls to. */
		id: string;
		title: string;
		description?: string;
		children: Snippet;
	}

	let { id, title, description, children }: Props = $props();
</script>

<section {id} class="flex scroll-mt-6 flex-col gap-5">
	<header class="flex flex-col gap-2">
		<div class="section-rule">
			<h2 class="type-title text-xl">{title}</h2>
		</div>
		{#if description}
			<p class="text-muted-foreground max-w-[75ch] text-sm">{description}</p>
		{/if}
	</header>
	<div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
		{@render children()}
	</div>
</section>
