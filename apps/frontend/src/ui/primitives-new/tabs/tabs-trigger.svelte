<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';

	import { cn } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(
		// A chip is 36px tall; on a touch screen it grows to the 44px a finger needs.
		"chip pop-sm pop-press pointer-coarse:min-h-11 focus-visible:ring-ring/50 inline-flex shrink-0 items-center justify-center gap-1.5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
	{...restProps} />
