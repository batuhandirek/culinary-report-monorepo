<script lang="ts">
	import { nanoid } from 'nanoid';

	import { cn } from '#ui/lib/utils.js';
	import { Item } from '#ui/primitives-new/radio-group/index.js';

	/**
	 * One compact line of a `RadioGroup.Root`: the dot and its label, 44px tall on touch,
	 * the whole line clickable. For a short, self-explanatory set. Options that each
	 * deserve a sentence are `RadioRows`, which needs no group around it.
	 */
	interface Props {
		value: string;
		id?: string;
		disabled?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { value, id = nanoid(), disabled = false, class: className = '', children }: Props = $props();
</script>

<!-- Selected is ink, like the checkbox and RadioRows — the primitive's own dot is orange. -->
<div class={cn('flex min-h-11 items-center lg:min-h-9', className)}>
	<Item
		{id}
		{value}
		{disabled}
		class="peer border-input data-[state=checked]:border-ink size-5 border-[1.5px] shadow-none [&_svg]:size-2.5 [&_svg]:fill-ink [&_svg]:text-ink" />
	<label
		for={id}
		class="text-ink flex flex-1 cursor-pointer items-center self-stretch pl-3 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
		{@render children?.()}
	</label>
</div>
