<script lang="ts">
	import { cn } from '#ui/lib/utils.js';
	import StarHalfIcon from '@lucide/svelte/icons/star-half';
	import StarIcon from '@lucide/svelte/icons/star';
	import { RatingGroup } from 'bits-ui';
	import type { StarRatingStarProps } from '#ui/primitives-new/star-rating/types.js';

	let { index, state, class: className }: StarRatingStarProps = $props();
</script>

<RatingGroup.Item
	{index}
	class={cn(
		'ring-ring/50 text-primary-darker group/item size-5 rounded-md outline-hidden group-aria-disabled:opacity-50 focus-visible:ring-[3px]',
		className
	)}
>
	<div class="relative size-full">
		<StarIcon
			class={cn('size-full fill-transparent transition-all', {
				'fill-current': state === 'active'
			})}
		/>
		<StarHalfIcon
			class={cn(
				'absolute top-0 left-0 size-full fill-transparent transition-all group-data-[state=active]/item:fill-current',
				{
					'ltr:fill-current': state === 'partial'
				}
			)}
		/>
		<StarHalfIcon
			class={cn(
				'absolute top-0 right-0 size-full scale-x-[-1] fill-transparent transition-all group-data-[state=active]/item:fill-current',
				{
					'rtl:fill-current': state === 'partial'
				}
			)}
		/>
	</div>
</RatingGroup.Item>
