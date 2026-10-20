<script lang="ts">
	import type { ComponentProps } from 'svelte';

	import { cn } from '#ui/lib/utils.js';
	import { Separator } from '#ui/primitives-new/separator/index.js';

	let {
		class: className,
		orientation = 'vertical',
		...restProps
	}: ComponentProps<typeof Separator> = $props();
</script>

<Separator
	data-slot="button-group-separator"
	{orientation}
	class={cn('bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto', className)}
	{...restProps} />
