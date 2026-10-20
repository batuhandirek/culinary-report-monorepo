<script lang="ts">
	import { nanoid } from 'nanoid';
	import type { Component } from 'svelte';

	import type { HTMLInputAttributes } from 'svelte/elements';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';
	import Input from '#ui/primitives-new/input/input.svelte';
	import { Spinner } from '#ui/primitives-new/spinner/index.js';

	/**
	 * The text field: the primitive's box plus a leading icon and a trailing spinner.
	 * `class` styles the box itself; the wrapper only exists to position the two glyphs.
	 */
	export interface InputProps extends Omit<HTMLInputAttributes, 'files'> {
		value?: string | number;
		id?: string;
		placeholder?: string;
		/** Leading glyph, e.g. a magnifier on a search box. */
		icon?: Component;
		type?: string;
		class?: string;
		/** A spinner at the trailing edge while a lookup the field drives is running. */
		loading?: boolean;
		ref?: HTMLInputElement | null;
	}

	let {
		value = $bindable(undefined),
		ref = $bindable(null),
		id = nanoid(),
		placeholder = '',
		icon = undefined,
		type = 'text',
		class: className = '',
		loading = false,
		...restProps
	}: InputProps = $props();
</script>

<div class="relative flex w-full items-center">
	{#if icon}
		<Icon
			{icon}
			size={16}
			strokeWidth={1.8}
			class="text-muted-foreground pointer-events-none absolute left-3.5" />
	{/if}
	<!-- The paddings that clear the glyphs are `!important`: a call site restyling the box
	     (`px-2`, `!border-0`) must not slide its text under them. -->
	<Input
		bind:ref={() => ref, (el) => (ref = el as HTMLInputElement | null)}
		{id}
		{type}
		{placeholder}
		bind:value
		aria-busy={loading || undefined}
		class={cn(className, icon && '!pl-10', loading && '!pr-10')}
		{...restProps} />
	{#if loading}
		<Spinner class="text-muted-foreground pointer-events-none absolute right-3.5" />
	{/if}
</div>
