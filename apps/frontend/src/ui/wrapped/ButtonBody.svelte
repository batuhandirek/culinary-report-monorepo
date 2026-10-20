<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	import { Spinner } from '#ui/primitives-new/spinner/index.js';

	/**
	 * What sits inside `Button` and `Buttonish`: leading icon, label, trailing icon, and the
	 * loading state. Spacing comes from the button's own `gap`, glyph size from its size
	 * variant — nothing here sets either.
	 *
	 * Loading never changes the button's width: a leading icon is swapped for the spinner,
	 * and a button without one keeps its label in the layout (invisible) with the spinner
	 * centred over it. The host must be positioned for that second case.
	 */
	interface Props {
		icon?: Component;
		suffixIcon?: Component;
		loading?: boolean;
		iconClass?: string;
		/** An icon-only button: nothing but the glyph, so the spinner replaces it. */
		iconOnly?: boolean;
		children?: Snippet;
	}

	let {
		icon = undefined,
		suffixIcon = undefined,
		loading = false,
		iconClass = '',
		iconOnly = false,
		children
	}: Props = $props();

	// No leading icon to swap: the spinner goes over the (hidden) label instead.
	let overlay = $derived(loading && !icon && !iconOnly);
</script>

{#if loading && !overlay}
	<Spinner class="shrink-0" />
{:else if icon}
	{@const PrefixIcon = icon}
	<PrefixIcon class={['shrink-0', iconClass]} />
{/if}

{#if overlay}
	<span class="absolute inset-0 grid place-items-center">
		<Spinner />
	</span>
{/if}

{#if !(loading && iconOnly)}
	<!-- `contents` keeps the label and suffix as flex children of the button; `invisible`
	     inherits through it, so they hold their width while the spinner shows. -->
	<span class={['contents', overlay ? 'invisible' : '']}>
		{@render children?.()}
		{#if suffixIcon}
			{@const SuffixIcon = suffixIcon}
			<SuffixIcon class="shrink-0" />
		{/if}
	</span>
{/if}
