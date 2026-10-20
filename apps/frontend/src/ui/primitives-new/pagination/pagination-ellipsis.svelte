<script lang="ts">
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';

	import type { HTMLAttributes } from 'svelte/elements';

	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import { cn, type WithElementRef, type WithoutChildren } from '#ui/lib/utils.js';

	const labels = getUiLabels();

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> = $props();
</script>

<span
	bind:this={ref}
	aria-hidden="true"
	data-slot="pagination-ellipsis"
	class={cn('flex size-9 items-center justify-center', className)}
	{...restProps}>
	<EllipsisIcon class="size-4" />
	<span class="sr-only">{labels.more}</span>
</span>
