<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	import { cn } from '#ui/lib/utils.js';

	// One card of a dense detail page (the brand and branch pages): a hairline card with a 40px
	// head row — an icon, the title, a quieter note (a count, a scope), and on the right a link,
	// a hint or a key — then its body. `flush` bodies (tables, row lists) run to the card's edges;
	// otherwise the body gets the head's 14px gutter.
	interface Props {
		title: string;
		/** A quieter word after the title: a count, a scope */
		note?: string | number;
		icon?: Component;
		/** Right of the head: a link, a hint, a key */
		aside?: Snippet;
		/** The body runs to the card's edges (tables, rows with their own padding) */
		flush?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { title, note, icon: Icon, aside, flush = false, class: className = '', children }: Props = $props();
</script>

<section class={cn('bg-paper border-line min-w-0 rounded-md border', flush && 'overflow-hidden', className)}>
	<div class="flex min-h-10 items-center gap-2 px-3.5 pt-2.5 pb-2 text-[13px] font-semibold">
		{#if Icon}<Icon class="text-faint size-3.5 shrink-0" />{/if}
		<h2 class="m-0 text-[13px] font-semibold">{title}</h2>
		{#if note !== undefined && note !== ''}<span class="text-faint font-medium">{note}</span>{/if}
		{#if aside}
			<div class="ml-auto flex min-w-0 items-center gap-1.5 text-xs font-normal">{@render aside()}</div>
		{/if}
	</div>
	<div class={flush ? '' : 'px-3.5 pb-3'}>
		{@render children?.()}
	</div>
</section>
