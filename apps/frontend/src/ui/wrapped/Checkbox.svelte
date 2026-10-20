<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import { nanoid } from 'nanoid';

	import { cn, type WithoutChildrenOrChild } from '#ui/lib/utils.js';
	import { Checkbox } from '#ui/primitives-new/checkbox/index.js';

	interface Props extends WithoutChildrenOrChild<CheckboxPrimitive.RootProps> {
		checked?: boolean;
		indeterminate?: boolean;
		id?: string;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	}

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		id = nanoid(),
		children,
		// The row's class, not the box's — forwarded, a row height stretched the box with it.
		class: className = '',
		...rest
	}: Props = $props();
</script>

<!-- A real <label>, stretched over the row, so the text toggles too — the box alone is a
     20px target. `self-stretch` lets a call site grow the hit area with a row height, and
     the gap between box and text is the label's own padding, so it is not a dead strip.
     On touch the label's hit area also reaches 12px above and below the line and back over
     the box: 44px tall without making the row any taller. It sits *behind* the label's
     content (`isolate` + `-z-10`), so a link in the text still takes its own tap. -->
<div class={cn(['flex w-full items-center text-sm', className])}>
	<Checkbox
		{id}
		class="border-input data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink size-5 shrink-0 rounded-[6px] border-[1.5px] shadow-none data-[state=checked]:text-white data-[state=indeterminate]:text-white [&_svg]:size-3.5"
		bind:checked
		bind:indeterminate
		{...rest} />
	{#if children}
		<label
			for={id}
			class="relative isolate flex flex-1 cursor-pointer items-center self-stretch pl-3 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 pointer-coarse:after:absolute pointer-coarse:after:-inset-y-3 pointer-coarse:after:right-0 pointer-coarse:after:-left-5 pointer-coarse:after:-z-10 pointer-coarse:after:content-['']">
			{@render children()}
		</label>
	{/if}
</div>
