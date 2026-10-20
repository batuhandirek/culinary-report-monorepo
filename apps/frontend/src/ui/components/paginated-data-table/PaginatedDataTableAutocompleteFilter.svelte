<script lang="ts">
	import { Check, LoaderCircle, Search } from '@lucide/svelte';

	import { onDestroy } from 'svelte';

	import type { PaginatedDataTableAutocompleteFilterProps } from './types';

	import { logFactory } from '#ui/lib/logger.js';

	let {
		value,
		onChange,
		api,
		queryKey = 'q',
		labelKey = 'name',
		valueKey = 'id'
	}: PaginatedDataTableAutocompleteFilterProps = $props();

	const logger = logFactory.create('DataTableAutocomplete');
	const MIN_LENGTH = 2;

	let q = $state('');
	let items = $state<Record<string, unknown>[]>([]);
	let loading = $state(false);
	let failed = $state(false);
	let searched = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Only the latest request may fill the list.
	let requestId = 0;

	const search = async (query: string) => {
		const id = ++requestId;
		loading = true;
		failed = false;
		try {
			const res = await (
				api as unknown as (params: Record<string, unknown>) => ReturnType<typeof api>
			)({ [queryKey]: query, size: 10, page: 1 });
			if (id !== requestId) return;
			items = res.items as Record<string, unknown>[];
			searched = true;
		} catch (e) {
			if (id !== requestId) return;
			logger.error(e);
			failed = true;
		} finally {
			if (id === requestId) loading = false;
		}
	};

	const onInput = () => {
		clearTimeout(timer);
		const query = q.trim();
		if (query.length < MIN_LENGTH) {
			requestId++;
			items = [];
			searched = false;
			loading = false;
			return;
		}
		timer = setTimeout(() => search(query), 300);
	};

	onDestroy(() => clearTimeout(timer));
</script>

<div class="flex flex-col">
	<label class="border-line flex h-9 items-center gap-2 border-b px-3">
		{#if loading}
			<LoaderCircle class="text-muted-foreground size-3.5 shrink-0 animate-spin" />
		{:else}
			<Search class="text-muted-foreground size-3.5 shrink-0" />
		{/if}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="search"
			bind:value={q}
			oninput={onInput}
			autofocus
			autocomplete="off"
			spellcheck="false"
			placeholder="Type to search…"
			aria-label="Search"
			class="placeholder:text-muted-foreground min-w-0 flex-1 appearance-none bg-transparent text-xs outline-none [&::-webkit-search-cancel-button]:hidden" />
	</label>
	<ul class="m-0 max-h-64 list-none overflow-y-auto p-1">
		{#each items as item (item[valueKey])}
			{@const itemValue = String(item[valueKey])}
			{@const itemLabel = String(item[labelKey] ?? itemValue)}
			<li>
				<button
					type="button"
					class="hover:bg-sand flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs"
					onclick={() => onChange(itemValue, itemLabel)}>
					<Check
						class={`size-3.5 shrink-0 ${value === itemValue ? 'text-ink' : 'text-transparent'}`} />
					<span class="min-w-0 flex-1 truncate">{itemLabel}</span>
				</button>
			</li>
		{:else}
			<li class="text-muted-foreground px-2 py-3 text-center text-xs">
				{#if failed}
					Couldn't search. Try again.
				{:else if searched}
					No matches
				{:else}
					Type at least {MIN_LENGTH} characters
				{/if}
			</li>
		{/each}
	</ul>
</div>
