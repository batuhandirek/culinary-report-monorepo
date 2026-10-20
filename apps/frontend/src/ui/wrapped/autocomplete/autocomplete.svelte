<script lang="ts" generics="T extends PaginatedApi">
	import { Check, Search } from '@lucide/svelte';

	import Icon from '#ui/components/Icon.svelte';
	import NoResult from '#ui/components/NoResult.svelte';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import * as Popover from '#ui/primitives-new/popover/index.js';
	import type { ItemOfPaginatedApi, PaginatedApi } from '#ui/types/pagination.types.js';
	import type { AutocompleteProps } from '#ui/wrapped/autocomplete/types.js';
	import FieldTrigger from '#ui/wrapped/FieldTrigger.svelte';
	import Input from '#ui/wrapped/Input.svelte';

	let {
		value = $bindable(),
		selectedLabel = $bindable(),
		open = $bindable(false),
		filters,
		onChange,
		api,
		class: className = '',
		disabled = false,
		size = 10,
		placeholder = 'Select',
		searchPlaceholder = 'Search',
		queryKey = 'q',
		labelKey,
		valueKey
	}: AutocompleteProps<T> = $props();

	let q = $state('');
	let items = $state<ItemOfPaginatedApi<T>[]>([]);
	const loader = createLoader((query: Parameters<T>[0]) => api(query), {
		debounce: 300,
		onSuccess: (res) => (items = res.items)
	});
	// Shorter queries match too much of a paginated endpoint to be worth a request.
	const MIN_QUERY = 3;

	async function fetchItems() {
		if (q.length < MIN_QUERY) {
			items = [];
			return;
		}
		const filtersToUse = filters?.() ?? {};
		await loader.load({
			...filtersToUse,
			[queryKey]: q,
			page: 1,
			size,
			sort: ''
		} as Parameters<T>[0]);
	}

	function select(i: ItemOfPaginatedApi<T>) {
		const itemValue = (typeof valueKey === 'function' ? valueKey(i) : i[valueKey]) as string;
		const itemLabel = (typeof labelKey === 'function' ? labelKey(i) : i[labelKey]) as string;
		if (value === itemValue) {
			value = undefined;
			selectedLabel = undefined;
			onChange?.(undefined);
		} else {
			value = itemValue;
			selectedLabel = itemLabel;
			onChange?.(itemValue);
		}
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger {disabled} class="flex w-full">
		<FieldTrigger {open} {disabled} empty={!selectedLabel} class={className}>
			{selectedLabel ?? placeholder}
		</FieldTrigger>
	</Popover.Trigger>
	<Popover.Content
		class="z-100 flex max-h-80 w-(--bits-popover-anchor-width) min-w-56 flex-col overflow-y-auto p-0"
		side="bottom"
		align="start">
		<div class="border-line bg-popover sticky top-0 z-10 border-b">
			<Input
				icon={Search}
				placeholder={searchPlaceholder}
				bind:value={q}
				loading={loader.loading}
				oninput={fetchItems}
				autocomplete="off"
				class="!rounded-none !border-0 !bg-transparent focus-visible:!ring-0" />
		</div>
		<div class="flex flex-col p-1">
			{#each items as i (typeof valueKey === 'function' ? valueKey(i) : i[valueKey])}
				{@const itemValue = typeof valueKey === 'function' ? valueKey(i) : i[valueKey]}
				{@const itemLabel = typeof labelKey === 'function' ? labelKey(i) : i[labelKey]}
				<button
					type="button"
					onclick={() => {
						select(i);
					}}
					class="text-ink hover:bg-wash/70 focus-visible:bg-wash flex min-h-9 w-full cursor-default items-center gap-2.5 rounded-sm px-2 text-left text-sm outline-none select-none">
					<span class="grid size-5 shrink-0 place-items-center">
						{#if itemValue === value}
							<Icon icon={Check} class="size-4" />
						{/if}
					</span>
					<span class="min-w-0 flex-1 truncate">
						{itemLabel}
					</span>
				</button>
			{/each}
		</div>
		{#if q.length < MIN_QUERY}
			<p class="text-muted-foreground px-3 pb-3 text-xs">
				Type at least {MIN_QUERY} characters to search.
			</p>
		{:else if items.length === 0 && !loader.loading}
			<NoResult sm />
		{/if}
	</Popover.Content>
</Popover.Root>
