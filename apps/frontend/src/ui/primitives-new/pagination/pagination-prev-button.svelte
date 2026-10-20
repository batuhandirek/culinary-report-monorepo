<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { Pagination as PaginationPrimitive } from 'bits-ui';

	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import { cn } from '#ui/lib/utils.js';
	import { buttonVariants } from '#ui/primitives-new/button/index.js';

	const labels = getUiLabels();

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
	<ChevronLeftIcon class="size-4" />
	<span>{labels.previous}</span>
{/snippet}

<PaginationPrimitive.PrevButton
	bind:ref
	aria-label={labels.previousPage}
	class={cn(
		buttonVariants({
			size: 'default',
			variant: 'ghost',
			class: 'gap-1 px-2.5 sm:pl-2.5'
		}),
		className
	)}
	children={children || Fallback}
	{...restProps} />
