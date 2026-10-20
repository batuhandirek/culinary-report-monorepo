<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';

	import { scrollEdges } from '#ui/lib/scroll-edges.js';
	import { cn } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: TabsPrimitive.ListProps = $props();

	// A row wider than its box scrolls sideways: fade the edge that has more behind it
	// (`scroll-fade-x`) and keep the active tab on screen.
	$effect(() => {
		if (!ref) return;
		return scrollEdges(ref, { axis: 'x', follow: '[data-state="active"]' });
	});
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="underline-tabs-list"
	class={cn(
		// A hairline under the row; the active tab draws a 3px chili rule over it. Put
		// counts in an `eyebrow text-beet` span. `overflow-y-hidden` keeps the strip from
		// becoming a 1-2px vertical scroller, which on touch swallows vertical drags.
		'scroll-fade-x border-line text-muted-foreground relative flex w-full max-w-full items-end justify-start gap-5 overflow-x-auto overflow-y-hidden border-b',
		className
	)}
	{...restProps}>
	{@render children?.()}
</TabsPrimitive.List>

<style>
	:global([data-slot='underline-tabs-list']) {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	:global([data-slot='underline-tabs-list']::-webkit-scrollbar) {
		display: none;
	}
</style>
