<script lang="ts">
	import type { SelectSingleRootProps } from 'bits-ui';
	import type { Component } from 'svelte';

	import Icon from '#ui/components/Icon.svelte';
	import { Content, Group, Item, Root, Trigger } from '#ui/primitives-new/select/index.js';

	type Selectable = { label: string; value: string | number | null };

	/**
	 * One choice from a short, fixed list — sort orders, a page size. No search: a list
	 * long enough to need one is a `ResponsiveCombobox`.
	 */
	interface Props extends Omit<SelectSingleRootProps, 'items' | 'type'> {
		items: Selectable[];
		placeholder?: string;
		/** The trigger's width in px, or any CSS width. Omit to size to the content. */
		width?: number | string;
		/** `sm` is 36px for toolbars; the default is the field height. */
		size?: 'sm' | 'default';
		class?: string;
		icon?: Component;
		/** Names the control when no visible label does. */
		'aria-label'?: string;
	}

	let {
		value = $bindable(),
		items,
		placeholder = 'Seç',
		width = undefined,
		size = 'default',
		class: className = '',
		icon = undefined,
		'aria-label': ariaLabel = undefined,
		...restProps
	}: Props = $props();

	let rootSelected = $derived(items.find((i) => String(i.value) === value));
	let widthStyle = $derived(
		width === undefined ? undefined : `width: ${typeof width === 'number' ? `${width}px` : width}`
	);
</script>

<Root
	bind:value
	items={items.map((item) => ({ value: String(item.value), label: item.label, disabled: false }))}
	{...restProps}
	type="single">
	<Trigger {size} class={className} style={widthStyle} aria-label={ariaLabel}>
		<span class="flex min-w-0 items-center gap-2">
			{#if icon}
				<Icon {icon} class="shrink-0" />
			{/if}
			<span class={['truncate', rootSelected ? '' : 'text-faint']}>
				{rootSelected?.label ?? placeholder}
			</span>
		</span>
	</Trigger>
	<Content>
		<Group>
			{#each items as item (item.value)}
				<Item value={String(item.value)} label={item.label}>
					{item.label}
				</Item>
			{/each}
		</Group>
	</Content>
</Root>
