<script lang="ts" module>
	export type ComboboxItem = { label: string; value: string | number | null };
</script>

<script lang="ts">
	import { Check, Search } from '@lucide/svelte';

	import { normalizeTurkish } from '#lib/util.js';
	import Input from '#ui/wrapped/Input.svelte';

	/**
	 * The inside of `ResponsiveCombobox` / `ResponsiveMultiCombobox`: a search box pinned
	 * over a list of options. Typing filters (Turkish-folded), ↑ ↓ Home End move the
	 * highlight, Enter picks it — focus never leaves the search box.
	 */
	interface Props {
		items: ComboboxItem[];
		isSelected: (value: ComboboxItem['value']) => boolean;
		onPick: (value: ComboboxItem['value']) => void;
		/** Checkbox rows that stay open, instead of a single tick. */
		multiple?: boolean;
		searchPlaceholder?: string;
		emptyText?: string;
	}

	let {
		items,
		isSelected,
		onPick,
		multiple = false,
		searchPlaceholder = 'Ara',
		emptyText = 'Sonuç yok'
	}: Props = $props();

	const uid = $props.id();

	let query = $state('');
	let highlighted = $state(-1);
	let list = $state<HTMLElement | null>(null);

	let filtered = $derived.by(() => {
		const q = normalizeTurkish(query);
		return q ? items.filter((i) => normalizeTurkish(i.label).includes(q)) : items;
	});

	const move = (to: number) => {
		if (filtered.length === 0) return;
		highlighted = (to + filtered.length) % filtered.length;
		list
			?.querySelector(`[data-index="${highlighted}"]`)
			?.scrollIntoView({ block: 'nearest' });
	};

	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			move(highlighted + 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			move(highlighted <= 0 ? filtered.length - 1 : highlighted - 1);
		} else if (e.key === 'Home') {
			e.preventDefault();
			move(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			move(filtered.length - 1);
		} else if (e.key === 'Enter' && filtered[highlighted]) {
			e.preventDefault();
			onPick(filtered[highlighted].value);
		}
	};
</script>

<!-- Sticky rather than pinned outside the scroller: it is a direct child of whichever box
     scrolls (the card on desktop, the sheet body on touch), so one rule covers both. The
     ground follows the surface: the sheet is sand, the card paper — `lg:` is exactly
     layoutStore.touch's cut. -->
<div class="border-line bg-background lg:bg-popover sticky top-0 z-10 border-b">
	<Input
		class="!rounded-none !border-0 !bg-transparent focus-visible:!ring-0"
		bind:value={query}
		placeholder={searchPlaceholder}
		icon={Search}
		role="combobox"
		aria-expanded="true"
		aria-controls="{uid}-list"
		aria-activedescendant={highlighted >= 0 ? `${uid}-${highlighted}` : undefined}
		autocomplete="off"
		autocapitalize="off"
		spellcheck={false}
		oninput={() => (highlighted = filtered.length > 0 && query ? 0 : -1)}
		onkeydown={onKeydown} />
</div>
<div
	bind:this={list}
	id="{uid}-list"
	role="listbox"
	aria-multiselectable={multiple || undefined}
	class="flex flex-col p-1">
	{#each filtered as item, index (item.value)}
		{@const selected = isSelected(item.value)}
		<button
			type="button"
			role="option"
			id="{uid}-{index}"
			data-index={index}
			aria-selected={selected}
			data-highlighted={index === highlighted || undefined}
			tabindex="-1"
			class="text-ink hover:bg-wash/70 data-[highlighted]:bg-wash flex min-h-11 w-full cursor-default items-center gap-2.5 rounded-sm px-2 text-left text-base outline-none select-none lg:min-h-9 lg:text-sm"
			onpointermove={() => (highlighted = index)}
			onclick={() => onPick(item.value)}>
			{#if multiple}
				<span
					class={[
						'grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px]',
						selected ? 'border-ink bg-ink text-white' : 'border-input bg-paper'
					]}>
					{#if selected}<Check class="size-3.5" />{/if}
				</span>
			{:else}
				<span class="grid size-5 shrink-0 place-items-center">
					{#if selected}<Check class="size-4" />{/if}
				</span>
			{/if}
			<span class={['min-w-0 flex-1 truncate', selected ? 'font-semibold' : '']}>
				{item.label}
			</span>
		</button>
	{:else}
		<div class="text-muted-foreground flex h-20 w-full items-center justify-center text-sm">
			{emptyText}
		</div>
	{/each}
</div>
