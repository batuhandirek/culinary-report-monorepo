<script lang="ts">
	import { ChevronsUpDown } from '@lucide/svelte';
	import type { Component, Snippet } from 'svelte';

	import type { HTMLAttributes } from 'svelte/elements';

	import { cn } from '#ui/lib/utils.js';

	/**
	 * A field's box on a `<div>`, for the inside of a trigger that opens a list — combobox,
	 * autocomplete, a picker. What `Buttonish` is to `Button`, this is to `Input`: the same
	 * height, radius, hairline and focus ring as a text field, so a form reads as one column
	 * of fields whether a row is typed into or picked from.
	 *
	 * The trigger around it is the real button; the focus ring is drawn on this box by the
	 * `[data-slot='field-trigger']` rule in `app.css`.
	 */
	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** Nothing is picked yet: the text reads as a placeholder. */
		empty?: boolean;
		/** The list is open. */
		open?: boolean;
		disabled?: boolean;
		invalid?: boolean;
		/** Leading glyph. */
		icon?: Component;
		class?: string;
		children?: Snippet;
	}

	let {
		empty = false,
		open = false,
		disabled = false,
		invalid = false,
		icon = undefined,
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<!-- No role or aria state of its own: the trigger around it is the control and already
     carries `aria-expanded`; this is only its face. -->
<div
	data-slot="field-trigger"
	data-state={open ? 'open' : 'closed'}
	data-disabled={disabled || undefined}
	data-invalid={invalid || undefined}
	class={cn(
		'border-input bg-paper text-ink flex h-(--field-height) w-full min-w-0 items-center gap-2 rounded-md border px-3.5 text-left text-sm font-normal transition-[color,box-shadow,border-color]',
		'hover:border-ink/35 data-[state=open]:border-ink',
		'data-[invalid]:border-destructive',
		'data-[disabled]:hover:border-input data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
		className
	)}
	{...rest}>
	{#if icon}
		{@const LeadingIcon = icon}
		<LeadingIcon class="text-muted-foreground size-4 shrink-0" />
	{/if}
	<span class={['min-w-0 flex-1 truncate', empty ? 'text-faint' : '']}>
		{@render children?.()}
	</span>
	<ChevronsUpDown class="text-muted-foreground size-4 shrink-0" />
</div>
