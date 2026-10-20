<script lang="ts">
	import type { ComponentProps } from 'svelte';

	import { cn } from '#ui/lib/utils.js';
	import { Input } from '#ui/primitives-new/input/index.js';

	let {
		class: className,
		value = $bindable(),
		...props
	}: ComponentProps<typeof Input> = $props();
</script>

<Input
	data-slot="input-group-control"
	bind:value
	class={cn(
		'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
		className
	)}
	{...props} />
