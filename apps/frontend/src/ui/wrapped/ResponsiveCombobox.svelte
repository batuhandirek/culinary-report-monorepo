<script lang="ts">
	import ComboboxList, { type ComboboxItem } from '#ui/wrapped/ComboboxList.svelte';
	import FieldTrigger from '#ui/wrapped/FieldTrigger.svelte';
	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';

	/**
	 * One choice from a long list, with search: a card under the field on desktop, a sheet
	 * on touch. For a handful of fixed options (sort orders) use `Select`; for options that
	 * each deserve a sentence, `RadioRows`.
	 */
	interface Props {
		items: ComboboxItem[];
		selected: ComboboxItem['value'];
		onSelect?: (v: ComboboxItem['value']) => void;
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
		onSelect
	}: Props = $props();

	let selectedLabel = $derived(items.find((f) => f.value === selected)?.label);
</script>

<!-- Closing on select stays the caller's job (`bind:open`), as it was on the popover:
     LocationInput drives it from its own city-change handler.

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
		<FieldTrigger {open} {disabled} {invalid} empty={!selectedLabel} class={className}>
			{selectedLabel ?? placeholder}
		</FieldTrigger>
	{/snippet}

	<ComboboxList
		{items}
		isSelected={(v) => v === selected}
		onPick={(v) => {
			// Picking the current option again takes it back.
			selected = selected === v ? null : v;
			onSelect?.(selected);
		}} />
</ResponsivePopover>
