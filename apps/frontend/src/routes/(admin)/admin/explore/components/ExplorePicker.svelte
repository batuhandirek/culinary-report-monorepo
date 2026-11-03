<script lang="ts">
	import { ChevronDown, X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';

	// One of the Explore bar's pickers: a pill saying what it picks and what is picked ("Brand
	// Burgermeister"), ink-framed while set, with an × that clears it; it opens a card with the
	// choices (`children`, mounted only while open, so a list may load when it opens).
	interface Props {
		label: string;
		/** What is picked, by name; absent = any */
		value?: string;
		/** The hover hint: what is picked, said in full */
		hint?: string;
		open?: boolean;
		/** A wider card: the topic trees */
		wide?: boolean;
		onClear?: () => void;
		children: Snippet;
	}

	let { label, value, hint, open = $bindable(false), wide = false, onClear, children }: Props = $props();
</script>

<span class={['inline-flex h-9 max-w-72 items-center rounded-full border text-sm', value ? 'border-ink bg-tint' : 'border-line bg-paper hover:bg-sand']} title={hint}>
	<ResponsivePopover bind:open title={label} hideHeader="popover" align="start" class={['max-h-[70vh] overflow-y-auto', wide ? 'w-[26rem]' : 'w-80'].join(' ')}>
		{#snippet trigger()}
			<span class={['inline-flex h-9 min-w-0 items-center gap-1.5 pl-3', value && onClear ? 'pr-1' : 'pr-2.5']}>
				<span class="text-muted-foreground shrink-0">{label}</span>
				{#if value}<span class="truncate font-medium">{value}</span>{/if}
				<ChevronDown class="text-muted-foreground size-3.5 shrink-0" />
			</span>
		{/snippet}
		{@render children()}
	</ResponsivePopover>
	{#if value && onClear}
		<button type="button" class="hover:bg-paper mr-1 flex size-7 shrink-0 items-center justify-center rounded-full" aria-label={`Clear ${label}`} title={`Clear ${label}`} onclick={onClear}>
			<X class="size-3.5" />
		</button>
	{/if}
</span>
