<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "#ui/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.ContentProps = $props();
</script>

<!-- A panel takes focus (tabindex 0) when Tab leaves the tab row, so it shows where focus
     went; the offset keeps the ring off the cards inside. -->
<TabsPrimitive.Content
	bind:ref
	data-slot="tabs-content"
	class={cn(
		"flex-1 rounded-md outline-none focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-ring/50",
		className
	)}
	{...restProps}
/>
