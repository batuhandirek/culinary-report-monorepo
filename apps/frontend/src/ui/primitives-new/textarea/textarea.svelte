<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	import { cn, type WithElementRef, type WithoutChildren } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		'border-input placeholder:text-faint focus-visible:border-ink focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 field-sizing-content flex min-h-16 w-full rounded-md border bg-paper px-3.5 py-2.5 text-sm outline-none transition-[color,box-shadow,border-color] focus-visible:ring-[3px] read-only:bg-wash/40 enabled:hover:border-ink/35 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	bind:value
	{...restProps}></textarea>
