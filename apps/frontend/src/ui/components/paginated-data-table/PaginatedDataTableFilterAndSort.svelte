<script lang="ts">
	import {
		ArrowUpDown,
		Check,
		ChevronDown,
		RefreshCw,
		SlidersHorizontal,
		X
	} from '@lucide/svelte';

	import { isFilterActive } from './format';
	import PaginatedDataTableAutocompleteFilter from './PaginatedDataTableAutocompleteFilter.svelte';
	import PaginatedDataTableTextFilter from './PaginatedDataTableTextFilter.svelte';
	import type {
		Filter,
		MultiSelectFilter,
		PaginatedDataTableFilterAndSortProps,
		SelectFilter
	} from './types';

	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import * as Popover from '#ui/primitives-new/popover/index.js';
	import * as Sheet from '#ui/primitives-new/sheet/index.js';

	let {
		appliedFilters,
		filters,
		sorts,
		onChange,
		onRefresh,
		refreshing = false,
		toolbar,
		class: className = ''
	}: PaginatedDataTableFilterAndSortProps = $props();

	let sort = $derived((appliedFilters as { sort?: string }).sort ?? '');
	let sortName = $derived(sorts.find((s) => s.value === sort)?.name);

	// Text filters are fields in the bar; everything else is a chip (a sheet on touch).
	let textFilters = $derived(filters.filter((f) => f.type === 'text'));
	let chipFilters = $derived(filters.filter((f) => f.type !== 'text'));

	let activeCount = $derived(filters.filter((f) => isFilterActive(appliedFilters[f.key])).length);
	let activeChipCount = $derived(
		chipFilters.filter((f) => isFilterActive(appliedFilters[f.key])).length
	);

	// One popover at a time; a single-choice pick closes its own.
	let openKey = $state<string | null>(null);
	let filtersSheetOpen = $state(false);

	// What an autocomplete pick is called: the URL only keeps its id.
	let pickedLabels = $state<Record<string, string>>({});

	const selected = (key: string) =>
		(appliedFilters[key] as (string | number)[] | undefined) ?? [];

	function toggleOption(filter: SelectFilter | MultiSelectFilter, value: string | number) {
		const current = selected(filter.key);
		if (filter.type === 'select') {
			onChange({ ...appliedFilters, [filter.key]: current[0] === value ? [] : [value] });
			openKey = null;
			return;
		}
		onChange({
			...appliedFilters,
			[filter.key]: current.includes(value)
				? current.filter((v) => v !== value)
				: [...current, value]
		});
	}

	function emptyValue(filter: Filter) {
		if (filter.type === 'select' || filter.type === 'multiSelect') return [];
		if (filter.type === 'toggle') return false;
		return undefined;
	}

	function clearFilter(filter: Filter) {
		onChange({ ...appliedFilters, [filter.key]: emptyValue(filter) });
	}

	function clearAll() {
		const next = { ...appliedFilters };
		for (const filter of filters) next[filter.key] = emptyValue(filter);
		onChange(next);
	}

	// What a chip says once it is set: the option's name, or how many.
	function summary(filter: Filter): string {
		if (filter.type === 'select' || filter.type === 'multiSelect') {
			const names = selected(filter.key).map(
				(value) => filter.options.find((o) => o.value === value)?.name ?? String(value)
			);
			return names.length > 2 ? `${names.length} selected` : names.join(', ');
		}
		if (filter.type === 'autocomplete') {
			return appliedFilters[filter.key] ? (pickedLabels[filter.key] ?? '1 selected') : '';
		}
		return '';
	}

	const chip =
		'border-line bg-paper text-ink hover:border-ink/40 focus-visible:ring-ring/50 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2';
	const iconKey =
		'text-muted-foreground hover:bg-ink/5 hover:text-ink focus-visible:ring-ring/50 grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 disabled:opacity-50';
</script>

{#snippet filterChips()}
	{#each chipFilters as filter (filter.key)}
		{#if filter.type === 'toggle'}
			{@const on = !!appliedFilters[filter.key]}
			<button
				type="button"
				aria-pressed={on}
				class={cn(chip, on && 'border-ink bg-ink text-sand hover:border-ink')}
				onclick={() => onChange({ ...appliedFilters, [filter.key]: !on })}>
				{#if on}<Check class="size-3.5" />{/if}
				{filter.name}
			</button>
		{:else}
			{@const active = isFilterActive(appliedFilters[filter.key])}
			{@const text = summary(filter)}
			<Popover.Root
				open={openKey === filter.key}
				onOpenChange={(open) => (openKey = open ? filter.key : null)}>
				<span
					class={cn(
						'border-line bg-paper hover:border-ink/40 inline-flex h-8 shrink-0 items-center rounded-full border transition-colors',
						active && 'border-ink/50 bg-tint'
					)}>
					<Popover.Trigger
						class={cn(
							'focus-visible:ring-ring/50 inline-flex h-full items-center gap-1.5 rounded-full pl-3 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2',
							active ? 'pr-1' : 'pr-2.5'
						)}>
						<span>{filter.name}{active ? ':' : ''}</span>
						{#if active}
							<span class="max-w-40 truncate font-semibold">{text}</span>
						{:else}
							<ChevronDown class="text-muted-foreground size-3.5" />
						{/if}
					</Popover.Trigger>
					{#if active}
						<button
							type="button"
							class="hover:bg-ink/10 mr-1 grid size-6 place-items-center rounded-full"
							aria-label={`Clear ${filter.name}`}
							onclick={() => clearFilter(filter)}>
							<X class="size-3.5" />
						</button>
					{/if}
				</span>
				<Popover.Content class="w-60 p-0" align="start" side="bottom">
					{#if filter.type === 'autocomplete'}
						<PaginatedDataTableAutocompleteFilter
							value={appliedFilters[filter.key] as string | undefined}
							onChange={(value, label) => {
								if (value && label) pickedLabels[filter.key] = label;
								onChange({ ...appliedFilters, [filter.key]: value });
								openKey = null;
							}}
							api={filter.api}
							queryKey={filter.queryKey}
							labelKey={filter.labelKey}
							valueKey={filter.valueKey} />
					{:else if filter.type === 'select' || filter.type === 'multiSelect'}
						<ul
							class="m-0 max-h-72 list-none overflow-y-auto p-1"
							role="listbox"
							aria-label={filter.name}
							aria-multiselectable={filter.type === 'multiSelect'}>
							{#each filter.options as option (option.value)}
								{@const on = selected(filter.key).includes(option.value)}
								<li>
									<button
										type="button"
										role="option"
										aria-selected={on}
										class="hover:bg-sand focus-visible:bg-sand flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none"
										onclick={() => toggleOption(filter, option.value)}>
										{#if filter.type === 'multiSelect'}
											<span
												class={cn(
													'border-ink/40 grid size-3.5 shrink-0 place-items-center rounded-[3px] border',
													on && 'border-ink bg-ink text-sand'
												)}>
												{#if on}<Check
														class="size-3"
														strokeWidth={3} />{/if}
											</span>
										{/if}
										<span
											class={cn(
												'min-w-0 flex-1 truncate',
												on && 'font-semibold'
											)}>
											{option.name}
										</span>
										{#if filter.type === 'select' && on}
											<Check class="size-3.5 shrink-0" />
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</Popover.Content>
			</Popover.Root>
		{/if}
	{/each}
{/snippet}

{#snippet sortControl()}
	{#if sorts.length > 0}
		<Popover.Root
			open={openKey === '__sort'}
			onOpenChange={(open) => (openKey = open ? '__sort' : null)}>
			<Popover.Trigger class={chip} aria-label="Sort">
				<ArrowUpDown class="text-muted-foreground size-3.5" />
				<span class="max-w-40 truncate">{sortName ?? 'Sort'}</span>
			</Popover.Trigger>
			<Popover.Content class="w-56 p-1" align="end" side="bottom">
				<ul class="m-0 list-none p-0" role="listbox" aria-label="Sort">
					{#each sorts as option (option.value)}
						{@const on = sort === option.value}
						<li>
							<button
								type="button"
								role="option"
								aria-selected={on}
								class="hover:bg-sand focus-visible:bg-sand flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none"
								onclick={() => {
									onChange({ ...appliedFilters, sort: option.value });
									openKey = null;
								}}>
								<span class={cn('min-w-0 flex-1 truncate', on && 'font-semibold')}>
									{option.name}
								</span>
								{#if on}<Check class="size-3.5 shrink-0" />{/if}
							</button>
						</li>
					{/each}
				</ul>
			</Popover.Content>
		</Popover.Root>
	{/if}
{/snippet}

<div class={cn('flex w-full flex-wrap items-center gap-2', className)}>
	{#each textFilters as filter (filter.key)}
		<PaginatedDataTableTextFilter
			value={appliedFilters[filter.key] as string | undefined}
			placeholder={filter.type === 'text' && filter.placeholder
				? filter.placeholder
				: filter.name === 'Search'
					? 'Search…'
					: `Search by ${filter.name}…`}
			onChange={(value) => onChange({ ...appliedFilters, [filter.key]: value })} />
	{/each}

	{#if layoutStore.touch}
		{#if chipFilters.length > 0}
			<Sheet.Root bind:open={filtersSheetOpen}>
				<Sheet.Trigger class={cn(chip, activeChipCount > 0 && 'border-ink/50 bg-tint')}>
					<SlidersHorizontal class="size-3.5" />
					Filters
					{#if activeChipCount > 0}
						<span class="font-semibold tabular-nums">{activeChipCount}</span>
					{/if}
				</Sheet.Trigger>
				<Sheet.Content side="right" class="w-72 gap-0 overflow-y-auto pb-safe-4">
					<Sheet.Header class="text-left">
						<Sheet.Title>Filters</Sheet.Title>
					</Sheet.Header>
					<div class="flex flex-col items-start gap-2 px-4">
						{@render filterChips()}
						{#if activeCount > 0}
							<button
								type="button"
								class="text-muted-foreground hover:text-ink mt-2 text-xs underline underline-offset-4"
								onclick={clearAll}>
								Clear all
							</button>
						{/if}
					</div>
				</Sheet.Content>
			</Sheet.Root>
		{/if}
	{:else}
		{@render filterChips()}
	{/if}

	{#if activeCount > 0 && !layoutStore.touch}
		<button
			type="button"
			class="text-muted-foreground hover:text-ink px-1 text-xs underline underline-offset-4"
			onclick={clearAll}>
			Clear{activeCount > 1 ? ` all ${activeCount}` : ''}
		</button>
	{/if}

	<div class="min-w-0 flex-1"></div>

	{@render toolbar?.()}
	{#if onRefresh}
		<button
			type="button"
			class={iconKey}
			aria-label="Refresh"
			title="Refresh"
			disabled={refreshing}
			onclick={onRefresh}>
			<RefreshCw class={cn('size-3.5', refreshing && 'animate-spin')} />
		</button>
	{/if}
	{@render sortControl()}
</div>
