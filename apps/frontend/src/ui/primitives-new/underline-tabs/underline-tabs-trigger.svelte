<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { box } from 'svelte-toolbelt';

	import { useUnderlineTabsTrigger } from './underline-tabs.svelte.js';

	import { cn } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		value,
		class: className,
		onmouseenter,
		onmouseleave,
		onfocus,
		onblur,
		children,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();

	const state = useUnderlineTabsTrigger({
		value: box.with(() => value),
		onmouseenter: box.with(() => onmouseenter),
		onmouseleave: box.with(() => onmouseleave),
		onfocus: box.with(() => onfocus),
		onblur: box.with(() => onblur)
	});
</script>

<div class="relative">
	<TabsPrimitive.Trigger
		bind:ref
		data-slot="underline-tabs-trigger"
		class={cn(
			"text-muted-foreground hover:text-ink data-[state=active]:text-ink relative z-2 -mb-px inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap border-b-[3px] border-transparent text-[0.9375rem] font-medium transition-colors rounded-t-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-b-chili data-[state=active]:font-semibold [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
			className
		)}
		{...state.props}
		{...restProps}>
		{@render children?.()}
	</TabsPrimitive.Trigger>
</div>
