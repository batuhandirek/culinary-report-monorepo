<script lang="ts">
	import { ChevronDown, ChevronRight } from '@lucide/svelte';
	import type { Collapsible as CollapsiblePrimitive } from 'bits-ui';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';
	import * as Collapsible from '#ui/primitives-new/collapsible/index.js';

	interface Props extends Omit<CollapsiblePrimitive.RootProps, 'child' | 'children'> {
		triggerClass?: string;
		contentClass?: string;
		trigger: import('svelte').Snippet<[{ open: boolean }]>;
		children: import('svelte').Snippet<[{ open: boolean }]>;
		withPrefixIcon?: boolean;
		withSuffixIcon?: boolean;
	}

	let {
		open = $bindable(false),
		withPrefixIcon = false,
		withSuffixIcon = false,
		onOpenChange,
		disabled,
		triggerClass = '',
		contentClass = '',
		class: className = '',
		trigger,
		children,
		...restProps
	}: Props = $props();
</script>

<Collapsible.Root bind:open {onOpenChange} {disabled} class={className} {...restProps}>
	<Collapsible.Trigger
		class={cn(
			'focus-visible:ring-ring/50 flex w-full cursor-pointer items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
			triggerClass
		)}>
		{#if withPrefixIcon}
			<Icon
				icon={ChevronRight}
				class="shrink-0 transition-transform duration-200 {open ? 'rotate-90' : 'rotate-0'}" />
		{/if}
		{@render trigger({ open })}
		{#if withSuffixIcon}
			<!-- Down when closed, up when open; `ml-auto` parks it at the row's far edge. -->
			<Icon
				icon={ChevronDown}
				class="ml-auto shrink-0 transition-transform duration-200 {open
					? 'rotate-180'
					: 'rotate-0'}" />
		{/if}
	</Collapsible.Trigger>

	<Collapsible.Content
		class={cn(
			'data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden',
			contentClass
		)}>
		{@render children({ open })}
	</Collapsible.Content>
</Collapsible.Root>
