<script lang="ts">
	import type { Snippet } from 'svelte';

	// One step of the pipeline over a source, numbered in the order it runs, with when it ran.
	interface Props {
		step: number;
		title: string;
		/** When it ran, or why it did not */
		note?: string;
		children: Snippet;
	}

	let { step, title, note, children }: Props = $props();
</script>

<section class="flex min-w-0 flex-col gap-2">
	<header class="border-line flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-1">
		<span class="eyebrow text-beet">Step {step}</span>
		<h4 class="m-0 text-sm font-semibold">{title}</h4>
		{#if note}<span class="text-muted-foreground text-xs">{note}</span>{/if}
	</header>
	{@render children()}
</section>
