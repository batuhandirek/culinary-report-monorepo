<script lang="ts">
	import { Label as LabelPrimitive } from 'bits-ui';

	import { cn } from '#ui/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={cn(
		'text-ink flex select-none items-center gap-2 text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
		className
	)}
	{...restProps} />
