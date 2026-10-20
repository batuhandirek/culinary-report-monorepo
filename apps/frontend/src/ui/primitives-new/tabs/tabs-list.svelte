<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';

	import { scrollEdges } from '#ui/lib/scroll-edges.js';
	import { cn } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.ListProps = $props();

	// A row wider than its box scrolls sideways: fade the edge that has more behind it
	// (`scroll-fade-x`) and keep the active chip on screen.
	$effect(() => {
		if (!ref) return;
		return scrollEdges(ref, { axis: 'x', follow: '[data-state="active"]' });
	});
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	class={cn(
		// Chip row rather than a segmented control: the design states selection as a filled
		// ink pill, so the sunken `bg-muted` track it used to sit in is gone. `py-1.5`
		// `overflow-x: auto` clips on both axes, so the chips' offset shadows need padding
		// to live in — bottom and right only, since that is the only direction they fall.
		'scroll-fade-x text-muted-foreground inline-flex h-auto w-fit max-w-full items-center justify-start gap-2 overflow-x-auto pb-2 pr-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
		className
	)}
	{...restProps} />
