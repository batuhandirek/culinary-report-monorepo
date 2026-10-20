<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Select as SelectPrimitive } from 'bits-ui';

	import { cn, type WithoutChild } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = 'default',
		...restProps
	}: WithoutChild<SelectPrimitive.TriggerProps> & {
		size?: 'sm' | 'default';
	} = $props();
</script>

<SelectPrimitive.Trigger
	bind:ref
	data-slot="select-trigger"
	data-size={size}
	class={cn(
		// Height as a plain class (not keyed off `data-size`), so a call site's `h-*` wins.
		// `sm` is 36px; on a touch screen its hit area reaches 44px past the box.
		size === 'sm'
			? "relative h-9 after:absolute after:inset-x-0 after:content-[''] pointer-coarse:after:-inset-y-1"
			: 'h-(--field-height)',
		"border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ink focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit select-none items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-paper px-3.5 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] enabled:hover:border-ink/35 disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
	{...restProps}>
	{@render children?.()}
	<ChevronDownIcon class="size-4 opacity-50" />
</SelectPrimitive.Trigger>
