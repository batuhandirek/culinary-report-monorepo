<script lang="ts">
	import ComboboxList, { type ComboboxItem } from '#ui/wrapped/ComboboxList.svelte';
	import FieldTrigger from '#ui/wrapped/FieldTrigger.svelte';
	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';

	/** Several choices from a long list, with search. The single-choice twin is `ResponsiveCombobox`. */
	interface Props {
		items: ComboboxItem[];
		selected?: ComboboxItem['value'][] | null;
		placeholder?: string;
		/**
		 * Sheet heading, defaulting to the placeholder. The desktop card hides it — the
		 * trigger sits directly above and already names the field.
		 */
		title?: string;
		disabled?: boolean;
		invalid?: boolean;
		open?: boolean;
		class?: string;
		onChange?: (value: ComboboxItem['value'][] | null) => void;
	}

	let {
		items,
		selected = $bindable(),
		placeholder = 'Seç',
		title,
		disabled = false,
		invalid = false,
		open = $bindable(false),
		class: className = '',
		onChange
	}: Props = $props();

	let picked = $derived(selected ?? []);
	// In the list's order, not the order they were ticked in.
	let pickedItems = $derived(items.filter((i) => picked.includes(i.value)));

	const toggle = (v: ComboboxItem['value']) => {
		selected = picked.includes(v) ? picked.filter((s) => s !== v) : [...picked, v];
		onChange?.([...selected]);
	};
</script>

<!-- Multi-select, so it deliberately stays open on toggle on both branches.

     The sheet is a fixed 50dvh, not a cap: same height whether the list has three rows
     or eighty. `h-*` is what does that — `max-h-*` alone still tracks content — and
     both need `!` to beat drawer-content's own data-attribute rules. -->
<ResponsivePopover
	bind:open
	{disabled}
	title={title ?? placeholder}
	hideHeader="popover"
	align="start"
	class="z-[100] max-h-[320px] w-(--bits-popover-anchor-width) min-w-56 overflow-y-auto p-0"
	drawerClass="!h-[50dvh] !max-h-[50dvh]">
	{#snippet trigger()}
		<FieldTrigger {open} {disabled} {invalid} empty={pickedItems.length === 0} class={className}>
			{#if pickedItems.length > 0}
				{pickedItems[0].label}
				{#if pickedItems.length > 1}
					<span class="bg-tint text-ink ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold">
						+{pickedItems.length - 1}
					</span>
				{/if}
			{:else}
				{placeholder}
			{/if}
		</FieldTrigger>
	{/snippet}

	<ComboboxList multiple {items} isSelected={(v) => picked.includes(v)} onPick={toggle} />
</ResponsivePopover>
