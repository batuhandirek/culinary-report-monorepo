<script lang="ts">
	import type { RatingGroupRootProps } from 'bits-ui';

	import { cn } from '#ui/lib/utils.js';
	import * as StarRating from '#ui/primitives-new/star-rating/index.js';

	type Size = 'sm' | 'md' | 'lg';

	interface Props extends Omit<RatingGroupRootProps, 'children' | 'child' | 'class'> {
		size?: Size;
		/** Extra classes for each star, e.g. a one-off `size-*`. */
		starClass?: string;
		class?: string;
	}

	let {
		value = $bindable(0),
		size = 'md',
		readonly = false,
		max = 5,
		starClass = '',
		class: className = '',
		...rest
	}: Props = $props();

	// The primitive's Star hardcodes `size-5`; tailwind-merge lets these win.
	const SIZES: Record<Size, string> = {
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-8'
	};

	// Readonly ratings are a display, not a control — drop the hover preview and the
	// gap the interactive version needs for comfortable tap targets.
	const gap = $derived(readonly ? 'gap-0.5' : 'gap-1');
</script>

<StarRating.Root
	bind:value
	{max}
	{readonly}
	hoverPreview={!readonly}
	class={cn(gap, className)}
	{...rest}>
	{#snippet children({ items })}
		{#each items as item (item.index)}
			<StarRating.Star
				index={item.index}
				state={item.state}
				class={cn(SIZES[size], readonly ? 'ring-0 ring-offset-0' : '', starClass)} />
		{/each}
	{/snippet}
</StarRating.Root>
