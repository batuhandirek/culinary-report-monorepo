<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import { cn, type WithElementRef, type WithoutChildren } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	class={cn(
		// A tint of ink rather than a palette colour, so the bar shows on sand, paper and wash
		// alike.
		'bg-ink/8 animate-pulse rounded-md',
		className
	)}
	{...restProps}>
</div>
