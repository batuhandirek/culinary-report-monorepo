<script lang="ts" generics="T, F extends Record<string, unknown> = Record<string, unknown>">
	import {
		ArrowDown,
		ArrowUp,
		ChevronLeft,
		ChevronRight,
		ChevronsUpDown,
		CircleAlert,
		Inbox,
		SearchX
	} from '@lucide/svelte';

	import { type Component, onDestroy, untrack } from 'svelte';

	import { getDataTableFill } from './context';
	import {
		copySearchParams,
		formatAbsolute,
		formatRelative,
		isFilterActive,
		pageWindow
	} from './format';
	import PaginatedDataTableFilterAndSort from './PaginatedDataTableFilterAndSort.svelte';
	import type {
		Column,
		MultiSelectFilter,
		PaginatedDataTableAction,
		PaginatedDataTableProps,
		SelectFilter
	} from './types';

	import { browser } from '$app/env';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import {
		createPaginatedLoader,
		type PaginationRequest
	} from '#ui/lib/paginated-loader.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import { Badge } from '#ui/primitives-new/badge/index.js';
	import { Button } from '#ui/primitives-new/button/index.js';
	import { Skeleton } from '#ui/primitives-new/skeleton/index.js';

	let {
		availableFilters = [],
		availableSorts = [],
		key = undefined,
		columns,
		actions = [],
		api,
		filters = $bindable({} as F),
		limit: requestedLimit = 10,
		syncWithSearchParams = false,
		onFiltersChange = undefined,
		onFetch = undefined,
		rowHref = undefined,
		noun = 'results',
		emptyTitle = undefined,
		emptyDescription = undefined,
		toolbar = undefined,
		fill = getDataTableFill(),
		pageSizes = [10, 15, 25, 50, 100]
	}: PaginatedDataTableProps<T, F> = $props();

	// `api` is typed to accept any client method (see `PaginatedDataTableProps`); this is the
	// one place it is called, with the table's own filters.
	type Page = {
		items: T[];
		page: number;
		pageSize: number;
		totalItems: number;
	};
	type Query = PaginationRequest & Record<string, unknown>;

	const fetchPage = (params: Query): Promise<Page> =>
		(api as unknown as (params: Query) => Promise<Page>)(params);

	// A table that has the page to itself shows a screenful, not a card's worth.
	const limit = fill ? Math.max(requestedLimit, 25) : requestedLimit;

	const positiveInt = (raw: string | null, fallback: number) => {
		const n = Number(raw);
		return Number.isInteger(n) && n > 0 ? n : fallback;
	};

	// --- Pagination state (page & size) ---
	let currentPage = $state(
		syncWithSearchParams ? positiveInt(page.url.searchParams.get('page'), 1) : 1
	);
	let currentSize = $state(
		syncWithSearchParams ? positiveInt(page.url.searchParams.get('size'), limit) : limit
	);
	let sizeOptions = $derived(
		[...new Set([...pageSizes, limit, currentSize])].sort((a, b) => a - b)
	);

	// --- URL search params sync ---

	function readFiltersFromUrl(): F {
		const params = page.url.searchParams;
		const result: Record<string, unknown> = { ...filters };

		const urlSort = params.get('sort');
		if (urlSort) result.sort = urlSort;

		for (const filter of availableFilters) {
			const raw = params.get(filter.key);

			if (raw == null) {
				if (result[filter.key] === undefined) {
					if (filter.type === 'multiSelect' || filter.type === 'select') {
						result[filter.key] = [];
					}
				}
				continue;
			}

			switch (filter.type) {
				case 'multiSelect':
				case 'select': {
					const selectFilter = filter as SelectFilter | MultiSelectFilter;
					const values = raw.split(',');
					result[filter.key] = values.map((v) => {
						const option = selectFilter.options.find((o) => String(o.value) === v);
						return option ? option.value : v;
					});
					break;
				}
				case 'toggle':
					result[filter.key] = raw === 'true';
					break;
				default:
					result[filter.key] = raw;
			}
		}

		return result as F;
	}

	// The table's query params live beside whatever else the page keeps in the URL.
	function replaceQuery(params: URLSearchParams) {
		if (!browser) return;
		const qs = params.toString();
		if (qs === page.url.searchParams.toString()) return;
		goto(page.url.pathname + (qs ? '?' + qs : ''), { replace: true, reset: false });
	}

	function writeFiltersToUrl(newFilters: Record<string, unknown>) {
		const params = copySearchParams(page.url);

		// The sort the table starts with needs no place in the URL.
		const defaultSort = (filters as { sort?: unknown }).sort;
		if (newFilters.sort && newFilters.sort !== defaultSort) {
			params.set('sort', String(newFilters.sort));
		} else {
			params.delete('sort');
		}

		for (const { key } of availableFilters) {
			const value = newFilters[key];
			if (!isFilterActive(value)) {
				params.delete(key);
			} else if (Array.isArray(value)) {
				params.set(key, value.join(','));
			} else if (typeof value === 'boolean') {
				params.set(key, 'true');
			} else {
				params.set(key, String(value));
			}
		}

		// Filter changes always reset to page 1
		params.delete('page');
		replaceQuery(params);
	}

	$effect(() => {
		if (!syncWithSearchParams || !browser) return;
		const pg = currentPage;
		const sz = currentSize;
		untrack(() => {
			const params = copySearchParams(page.url);
			if (pg > 1) params.set('page', String(pg));
			else params.delete('page');
			if (sz !== limit) params.set('size', String(sz));
			else params.delete('size');
			replaceQuery(params);
		});
	});

	// Snapshot the active filters into state rather than a `$derived`. A derived would
	// recompute on every read, and since it depends on the global `page.url` it gets
	// invalidated by the `goto()` calls above. During a route navigation the table's
	// subtree is flagged inert while this value is still dirty, so recomputing it (which
	// reads the parent-owned `filters` derived) trips Svelte's `derived_inert` warning.
	// Updating via a navigation-guarded effect avoids reads while the tree is tearing down.
	let effectiveFilters = $state<F>(syncWithSearchParams ? readFiltersFromUrl() : filters);
	$effect(() => {
		if (navigating.to) return;
		effectiveFilters = syncWithSearchParams ? readFiltersFromUrl() : filters;
	});

	function handleFiltersChange(newFilters: Record<string, unknown>) {
		if (syncWithSearchParams) {
			writeFiltersToUrl(newFilters);
		} else if (onFiltersChange) {
			onFiltersChange(newFilters as F);
		} else {
			filters = newFilters as F;
		}
	}

	function clearFilters() {
		const next: Record<string, unknown> = { ...effectiveFilters };
		for (const filter of availableFilters) {
			next[filter.key] =
				filter.type === 'select' || filter.type === 'multiSelect'
					? []
					: filter.type === 'toggle'
						? false
						: undefined;
		}
		handleFiltersChange(next);
	}

	// When this table unmounts in place (e.g. switching tabs that share a route), strip
	// the query params it owns so a sibling table doesn't inherit them. Skipped during a
	// route navigation, where the destination URL already replaces the query.
	onDestroy(() => {
		if (!syncWithSearchParams || !browser || navigating.to) return;
		const params = copySearchParams(page.url);
		for (const managed of ['sort', 'page', 'size', ...availableFilters.map((f) => f.key)]) {
			params.delete(managed);
		}
		replaceQuery(params);
	});

	// --- Loading ---

	const loader = createPaginatedLoader<[], Query, Page>(fetchPage, [], {
		initialPage: currentPage,
		initialPageSize: currentSize,
		onSuccess: (result) => onFetch?.(result.items)
	});

	// Until the first answer there is nothing to keep on screen, so skeleton rows stand in;
	// after it, the rows in view stay (dimmed) while the next page is on its way.
	let settled = $state(false);

	let lastFilters = '';
	let lastRequest = '';
	$effect(() => {
		const filtersJson = JSON.stringify(effectiveFilters);
		const pg = currentPage;
		const size = currentSize;
		// A new `key` asks for the same page again.
		const request = JSON.stringify([filtersJson, pg, size, key]);
		untrack(() => {
			// A parent handing over an equal filter object is not a new question.
			if (request === lastRequest) return;
			// A narrower list starts over at its first page.
			if (lastFilters && filtersJson !== lastFilters && pg !== 1) {
				lastFilters = filtersJson;
				currentPage = 1;
				return;
			}
			lastFilters = filtersJson;
			lastRequest = request;
			loader.pageSize = size;
			loader.loadPage(pg, effectiveFilters).then((result) => {
				if (!result) return;
				// The page in the URL ran past the end (rows were removed, a filter narrowed).
				const lastPage = Math.max(1, Math.ceil(result.totalItems / size));
				if (result.items.length === 0 && pg > lastPage) currentPage = lastPage;
			});
		});
	});
	$effect(() => {
		if (!loader.loading && (loader.lastLoadTime || loader.failed)) settled = true;
	});

	let rows = $derived(loader.items as T[]);
	let total = $derived(loader.totalItems);
	let totalPages = $derived(Math.max(1, Math.ceil(total / currentSize)));
	let refreshing = $derived(settled && loader.loading);
	let rangeStart = $derived(total === 0 ? 0 : (loader.currentPage - 1) * loader.pageSize + 1);
	let rangeEnd = $derived(total === 0 ? 0 : rangeStart + rows.length - 1);
	let filtersActive = $derived(
		availableFilters.some((f) => isFilterActive(effectiveFilters[f.key]))
	);
	let hasBar = $derived(availableFilters.length > 0 || availableSorts.length > 0 || !!toolbar);
	// A list that fits its smallest page needs no pager; an empty one inside a card needs no
	// footer at all (the page-filling table keeps its frame).
	let hasPages = $derived(!settled || total > sizeOptions[0] || currentPage > 1);
	let showFooter = $derived(fill || !settled || total > 0);

	const count = (n: number) => n.toLocaleString('en-US');

	// "1 order", not "1 orders": `noun` is given in the plural. A noun the rule does not
	// fit ("orders in escrow") is left as it is.
	const nounFor = (n: number) => {
		if (n !== 1) return noun;
		if (/(ch|sh|x|ss)es$/.test(noun)) return noun.slice(0, -2);
		if (/ies$/.test(noun)) return `${noun.slice(0, -3)}y`;
		return /[^s]s$/.test(noun) ? noun.slice(0, -1) : noun;
	};

	function changeSize(size: number) {
		// Keep the first row in view where it is.
		currentPage = Math.floor(((currentPage - 1) * currentSize) / size) + 1;
		currentSize = size;
	}

	// --- Sorting from a header ---

	let currentSort = $derived((effectiveFilters as { sort?: string }).sort);

	function sortDirection(column: Column<T>): 'asc' | 'desc' | null {
		if (!column.sort || !currentSort) return null;
		if (column.sort.desc === currentSort) return 'desc';
		if (column.sort.asc === currentSort) return 'asc';
		return null;
	}

	// The first click asks for what a reader expects first: newest and largest for dates
	// and figures, A to Z for text. The next one flips it.
	function toggleSort(column: Column<T>) {
		if (!column.sort) return;
		const { asc, desc } = column.sort;
		const direction = sortDirection(column);
		const descFirst = column.type === 'date' || isNumeric(column);
		const next =
			direction === 'desc'
				? (asc ?? desc)
				: direction === 'asc'
					? (desc ?? asc)
					: descFirst
						? (desc ?? asc)
						: (asc ?? desc);
		handleFiltersChange({ ...effectiveFilters, sort: next });
	}

	// --- Rows as links ---

	const INTERACTIVE =
		'a, button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [data-no-row-link]';

	function openRow(event: MouseEvent, row: T) {
		const href = rowHref?.(row);
		if (!href) return;
		if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
		// Dragging across a cell to copy its text is not a click on the row.
		if (window.getSelection()?.toString()) return;
		if (event.metaKey || event.ctrlKey || event.button === 1) {
			window.open(href, '_blank', 'noopener');
			return;
		}
		if (event.button !== 0) return;
		goto(href);
	}

	// --- Cells ---

	const isNumeric = (column: Column<T>) => !!column.numeric || column.type === 'count';

	const alignClass = (column: Column<T>) =>
		(column.align ?? (isNumeric(column) ? 'right' : 'left')) === 'right'
			? 'text-right'
			: column.align === 'center'
				? 'text-center'
				: 'text-left';

	const cellClass = (column: Column<T>, extra?: string) =>
		cn(
			'border-line border-b px-3 py-2 align-middle text-[0.8125rem] leading-5 whitespace-nowrap first:pl-4 last:pr-4',
			alignClass(column),
			isNumeric(column) && 'tabular-nums',
			column.class,
			extra
		);

	// A dash stands for "nothing here", whatever a column spelled it as.
	const isBlank = (value: unknown) =>
		value == null || (typeof value === 'string' && ['', '-', '—'].includes(value.trim()));

	const TONE = {
		neutral: 'font-medium',
		success: 'text-success font-semibold',
		warning: 'font-semibold text-[hsl(30_85%_30%)]',
		destructive: 'text-destructive font-semibold'
	};

	const visibleActions = (row: T) => actions.filter((action) => action.if?.(row) ?? true);
	let hasTrailingCell = $derived(actions.length > 0 || !!rowHref);

	// Skeleton bars of uneven length read as text, not as a grid of boxes.
	const SKELETON_WIDTHS = ['w-24', 'w-16', 'w-32', 'w-20', 'w-28', 'w-12'];
	let skeletonRows = $derived(Math.min(currentSize, 10));
</script>

{#snippet text(column: Column<T>, value: string | number)}
	{#if isBlank(value)}
		<span class="text-faint">—</span>
	{:else if column.truncate}
		<span class="block truncate" style:max-width={`${column.truncate}ch`} title={String(value)}>
			{value}
		</span>
	{:else}
		{value}
	{/if}
{/snippet}

{#snippet actionButton(action: PaginatedDataTableAction<T>, row: T)}
	{@const ActionIcon = action.icon}
	{@const href = action.href?.(row)}
	<Button
		variant="ghost"
		size="icon-xs"
		class={cn('text-muted-foreground hover:text-ink rounded-md', action.class)}
		{href}
		title={action.label}
		aria-label={action.label}
		onclick={href ? undefined : () => action.onClick?.(row)}>
		<ActionIcon class="size-4" />
	</Button>
{/snippet}

<div
	class={cn(
		'border-line bg-paper flex w-full min-w-0 flex-col overflow-hidden rounded-md border',
		fill && 'min-h-0 flex-1'
	)}>
	{#if hasBar}
		<PaginatedDataTableFilterAndSort
			appliedFilters={effectiveFilters}
			onChange={handleFiltersChange}
			sorts={availableSorts}
			filters={availableFilters}
			onRefresh={() => loader.reload()}
			{refreshing}
			{toolbar}
			class="border-line border-b px-3 py-2" />
	{/if}

	<div class={cn('relative flex min-w-0 flex-col', fill && 'min-h-0 flex-1')}>
		{#if refreshing}
			<div class="bg-primary-darker absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse"></div>
		{/if}
		<div class={cn('w-full overflow-x-auto', fill && 'min-h-0 flex-1 overflow-y-auto')}>
			<table
				class="w-full border-separate border-spacing-0 text-sm"
				aria-busy={loader.loading}>
				<thead>
					<tr>
						{#each columns as column (column.name)}
							{@const direction = sortDirection(column)}
							<th
								scope="col"
								aria-sort={direction === 'asc'
									? 'ascending'
									: direction === 'desc'
										? 'descending'
										: undefined}
								class={cn(
									'border-line bg-paper text-muted-foreground sticky top-0 z-10 h-9 border-b px-3 text-xs font-semibold whitespace-nowrap first:pl-4 last:pr-4',
									alignClass(column)
								)}>
								{#if column.sort}
									<button
										type="button"
										class={cn(
											'hover:text-ink group -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 outline-none focus-visible:ring-2',
											direction && 'text-ink'
										)}
										onclick={() => toggleSort(column)}>
										{column.label ?? column.name}
										{#if direction === 'asc'}
											<ArrowUp class="size-3" />
										{:else if direction === 'desc'}
											<ArrowDown class="size-3" />
										{:else}
											<ChevronsUpDown
												class="size-3 opacity-40 group-hover:opacity-100" />
										{/if}
									</button>
								{:else}
									{column.label ?? column.name}
								{/if}
							</th>
						{/each}
						{#if hasTrailingCell}
							<th class="border-line bg-paper sticky top-0 z-10 h-9 border-b">
								<span class="sr-only">Actions</span>
							</th>
						{/if}
					</tr>
				</thead>

				<tbody class={cn('transition-opacity', refreshing && 'opacity-50')}>
					{#if !settled}
						{#each { length: skeletonRows }, r (r)}
							<tr>
								{#each columns as column, c (column.name)}
									<td class={cellClass(column)}>
										<Skeleton
											class={cn(
												'h-3.5 rounded-sm',
												SKELETON_WIDTHS[
													(r + c * 2) % SKELETON_WIDTHS.length
												],
												alignClass(column) === 'text-right' && 'ml-auto'
											)} />
									</td>
								{/each}
								{#if hasTrailingCell}
									<td class="border-line border-b px-3"></td>
								{/if}
							</tr>
						{/each}
					{:else if !loader.error}
						{#each rows as row, i (i)}
							{@const href = rowHref?.(row)}
							<tr
								class={cn(
									'group/row hover:bg-sand/70 transition-colors [&:last-child>td]:border-b-0',
									href && 'cursor-pointer'
								)}
								onclick={href ? (e) => openRow(e, row) : undefined}
								onauxclick={href ? (e) => openRow(e, row) : undefined}>
								{#each columns as column (column.name)}
									{@const visible = column.if?.(row) ?? true}
									{#if !visible}
										<td class={cellClass(column)}
											><span class="text-faint">—</span></td>
									{:else if column.type === 'value'}
										{@const value = column.value(row)}
										{#if typeof value === 'object'}
											<td class={cellClass(column, value.class)}>
												{@render text(column, value.value)}
											</td>
										{:else}
											<td class={cellClass(column)}
												>{@render text(column, value)}</td>
										{/if}
									{:else if column.type === 'link'}
										{@const value = column.value(row)}
										<td
											class={cellClass(
												column,
												typeof value === 'object' ? value.class : undefined
											)}>
											<a
												href={column.href(row)}
												class="text-ink decoration-line hover:decoration-ink font-medium underline underline-offset-4">
												{@render text(
													column,
													typeof value === 'object' ? value.value : value
												)}
											</a>
										</td>
									{:else if column.type === 'date'}
										{@const value = column.value(row)}
										{@const absolute = formatAbsolute(
											value,
											column.format,
											true
										)}
										<td class={cellClass(column, 'tabular-nums')}>
											{#if absolute}
												<time
													datetime={new Date(value!).toISOString()}
													title={`${formatAbsolute(value)} · ${formatRelative(value)}`}>
													{absolute}
												</time>
												{#if column.relative}
													<span
														class="text-muted-foreground ml-1 text-xs">
														{formatRelative(value)}
													</span>
												{/if}
											{:else}
												<span class="text-faint">—</span>
											{/if}
										</td>
									{:else if column.type === 'badge'}
										{@const value = column.value(row)}
										<td class={cellClass(column)}>
											{#if isBlank(value)}
												<span class="text-faint">—</span>
											{:else}
												<Badge
													variant={column.variant?.(row) ?? 'outline'}
													class="rounded-full px-2 font-medium">
													{value}
												</Badge>
											{/if}
										</td>
									{:else if column.type === 'count'}
										{@const value = column.value(row)}
										<td class={cellClass(column)}>
											{#if value == null}
												<span class="text-faint">—</span>
											{:else if value === 0}
												<span class="text-faint">0</span>
											{:else}
												<span class={TONE[column.tone ?? 'neutral']}>
													{count(value)}
												</span>
											{/if}
										</td>
									{:else if column.type === 'html'}
										<td class={cellClass(column)}>
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											{@html column.html(row)}
										</td>
									{:else if column.type === 'component'}
										{@const props = column.props(row)}
										{@const Cell = column.component as unknown as Component<
											Record<string, unknown>
										>}
										<td class={cellClass(column)}>
											<Cell {...props}>
												{#if column.child}
													{column.child(row)}
												{/if}
											</Cell>
										</td>
									{:else if column.type === 'snippet'}
										<td class={cellClass(column)}>
											{@render column.snippet(row)}
										</td>
									{/if}
								{/each}
								{#if hasTrailingCell}
									{@const rowActions = visibleActions(row)}
									<td
										class="border-line w-px border-b py-1 pr-3 pl-1 whitespace-nowrap">
										<div class="flex items-center justify-end gap-0.5">
											{#each rowActions as action (action.label)}
												{#if action.type === 'separator'}
													<span class="bg-line mx-1 h-4 w-px"></span>
												{:else}
													{@render actionButton(action, row)}
												{/if}
											{/each}
											{#if href}
												<a
													{href}
													aria-label="Open"
													class="text-faint group-hover/row:text-ink focus-visible:ring-ring/50 grid size-7 place-items-center rounded-md outline-none focus-visible:ring-2">
													<ChevronRight class="size-4" />
												</a>
											{/if}
										</div>
									</td>
								{/if}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>

			<!-- Outside the table, so the message is as wide as what is in view, not as wide as
			     the columns: on a phone the table scrolls sideways and this stays put. -->
			{#if settled && loader.error}
				<div
					class="sticky left-0 flex w-full flex-col items-center gap-3 px-4 py-14 text-center">
					<span
						class="bg-destructive/10 text-destructive grid size-10 place-items-center rounded-full">
						<CircleAlert class="size-5" />
					</span>
					<div class="max-w-sm">
						<p class="m-0 font-semibold">Couldn't load {noun}</p>
						<p class="text-muted-foreground m-0 mt-1 text-sm">
							{loader.error.message || 'The request failed.'}
						</p>
					</div>
					<Button variant="outline" size="sm" onclick={() => loader.reload()}
						>Try again</Button>
				</div>
			{:else if settled && rows.length === 0}
				<div
					class="sticky left-0 flex w-full flex-col items-center gap-3 px-4 py-14 text-center">
					<span
						class="bg-sand text-muted-foreground grid size-10 place-items-center rounded-full">
						{#if filtersActive}
							<SearchX class="size-5" />
						{:else}
							<Inbox class="size-5" />
						{/if}
					</span>
					<div class="max-w-sm">
						<p class="m-0 font-semibold">
							{emptyTitle ?? (filtersActive ? `No ${noun} match` : `No ${noun} yet`)}
						</p>
						<p class="text-muted-foreground m-0 mt-1 text-sm">
							{filtersActive
								? 'Nothing fits these filters. Loosen or clear them.'
								: (emptyDescription ??
									'They will show up here as soon as there are any.')}
						</p>
					</div>
					{#if filtersActive}
						<Button variant="outline" size="sm" onclick={clearFilters}
							>Clear filters</Button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if showFooter}
		<div
			class="border-line text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-2 text-xs">
			<span class="tabular-nums" aria-live="polite">
				{#if !settled}
					<Skeleton class="h-3.5 w-28 rounded-sm" />
				{:else if total === 0}
					0 {noun}
				{:else if rows.length >= total}
					<!-- Everything is on screen: a range would only repeat the total. -->
					<span class="text-ink font-medium">{count(total)}</span>
					{nounFor(total)}
				{:else}
					<span class="text-ink font-medium">{count(rangeStart)}–{count(rangeEnd)}</span>
					of {count(total)}
					{noun}
				{/if}
			</span>
			<div class="flex-1"></div>
			{#if hasPages}
				<label class="flex items-center gap-2">
					<span class="hidden sm:inline">Rows</span>
					<select
						class="border-line bg-paper text-ink focus-visible:ring-ring/50 h-7 rounded-md border px-1.5 text-xs tabular-nums outline-none focus-visible:ring-2"
						aria-label="Rows per page"
						value={currentSize}
						onchange={(e) => changeSize(Number(e.currentTarget.value))}>
						{#each sizeOptions as size (size)}
							<option value={size}>{size}</option>
						{/each}
					</select>
				</label>
				<nav class="flex items-center gap-0.5" aria-label="Pagination">
					<Button
						variant="ghost"
						size="icon-xs"
						class="rounded-md"
						aria-label="Previous page"
						disabled={currentPage <= 1}
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}>
						<ChevronLeft class="size-4" />
					</Button>
					{#each pageWindow(currentPage, totalPages) as p, i (p === 'gap' ? `gap-${i}` : p)}
						{#if p === 'gap'}
							<span class="px-1" aria-hidden="true">…</span>
						{:else}
							<button
								type="button"
								aria-current={p === currentPage ? 'page' : undefined}
								class={cn(
									'hover:bg-ink/5 focus-visible:ring-ring/50 text-ink h-7 min-w-7 rounded-md px-1.5 text-xs tabular-nums outline-none focus-visible:ring-2',
									p === currentPage &&
										'bg-ink text-sand hover:bg-ink font-semibold'
								)}
								onclick={() => (currentPage = p)}>
								{p}
							</button>
						{/if}
					{/each}
					<Button
						variant="ghost"
						size="icon-xs"
						class="rounded-md"
						aria-label="Next page"
						disabled={currentPage >= totalPages}
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}>
						<ChevronRight class="size-4" />
					</Button>
				</nav>
			{/if}
		</div>
	{/if}
</div>
