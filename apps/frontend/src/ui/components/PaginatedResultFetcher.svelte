<script
	lang="ts"
	generics="T extends {items: unknown[], page: number, pageSize: number, totalItems: number}">
	import { nanoid } from 'nanoid';
	import { type Snippet, untrack } from 'svelte';

	import NoResult from './NoResult.svelte';
	import SomethingWentWrong from './SomethingWentWrong.svelte';

	import { logFactory } from '#ui/lib/logger.js';
	import { createPaginatedLoader } from '#ui/lib/paginated-loader.svelte.js';
	import IconPaginator from '#ui/wrapped/IconPaginator.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	interface Props {
		// For fetching
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		api: (...args: any[]) => Promise<T>;
		args?: unknown[];
		filters: object;
		size?: number;
		key?: string;

		// Config
		/** Draw the first load (skeleton rows, or `loadingSnippet`). Off, nothing is drawn. */
		showLoader?: boolean;
		hidePagination?: boolean;
		filterDebounceMs?: number;
		class?: string;

		// Snippets
		children: Snippet<
			[
				{
					results: T['items'];
					hasMore: boolean;
					loading: boolean;
					loadingInitial: boolean;
					loadingPage: boolean;
					loadingFilters: boolean;
					error: Error | null;
					currentPage: number;
					count: number;
					totalPages: number;
					hasPrevious: boolean;
				}
			]
		>;
		filtersSnippet?: Snippet;
		noResultSnippet?: Snippet;
		errorSnippet?: Snippet<[{ error: Error; retry: () => Promise<void> }]>;
		/** First-load placeholder shaped like the content. Drawn whether or not `showLoader` is set. */
		loadingSnippet?: Snippet;

		// State
		results?: T['items'];
		currentPage?: number;
		count?: number;
		totalPages?: number;
		hasMore?: boolean;
		hasPrevious?: boolean;

		// Hooks
		onFetch?: (r: T['items']) => void;
		onPageChange?: (page: number) => void;
	}

	let {
		api,
		args = [],
		filters,
		size = $bindable(10),
		key = nanoid(),

		showLoader = false,
		hidePagination = false,
		filterDebounceMs = 0,
		class: className = '',

		children,
		filtersSnippet,
		noResultSnippet,
		errorSnippet,
		loadingSnippet,

		results = $bindable([]),
		currentPage = $bindable(1),
		count = $bindable(0),
		totalPages = $bindable(0),
		hasMore = $bindable(false),
		hasPrevious = $bindable(false),

		onFetch = undefined,
		onPageChange = undefined
	}: Props = $props();

	const log = logFactory.create('PaginatedResultFetcher');

	// Loading state tracking
	let loadingInitial = $state(true);
	let loadingPage = $state(false);
	let loadingFilters = $state(false);

	const loader = createPaginatedLoader(api, args, {
		initialPage: currentPage,
		initialPageSize: size,
		onError: log.error,
		onSuccess: (result) => {
			onFetch?.(result.items);
		},
		onPageChange: (page) => {
			onPageChange?.(page);
		}
	});

	// Sync loader state with bindable props
	$effect(() => {
		results = loader.items;
		currentPage = loader.currentPage;
		count = loader.totalItems;
		totalPages = loader.totalPages;
		hasMore = loader.hasMore;
		hasPrevious = loader.hasPrevious;
	});

	// Each load takes a ticket; only the newest may clear the flags, so a superseded
	// response cannot drop them while the request that replaced it is still in flight.
	let ticket = 0;

	const load = async (kind: 'initial' | 'page' | 'filters', page: number) => {
		const mine = ++ticket;
		loadingInitial = kind === 'initial';
		loadingPage = kind === 'page';
		loadingFilters = kind === 'filters';
		try {
			await loader.loadPage(page, filters);
		} finally {
			if (mine === ticket) {
				loadingInitial = false;
				loadingPage = false;
				loadingFilters = false;
			}
		}
	};

	const retry = () => load('page', currentPage);

	// What the last load was asked with. Plain variables: bookkeeping for the effect
	// below, nothing renders from them.
	let prevPage = currentPage;
	let prevSize = size;
	let prevFilters = JSON.stringify(filters);
	let prevKey = key;
	let prevArgs = JSON.stringify(args);
	let started = false;
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

	// Single effect to handle all reactive loading
	$effect(() => {
		const nextFilters = JSON.stringify(filters);
		const nextArgs = JSON.stringify(args);
		const nextPage = currentPage;
		const nextSize = size;
		const nextKey = key;

		untrack(() => {
			const keyChanged = nextKey !== prevKey;
			const argsChanged = nextArgs !== prevArgs;
			const filtersChanged = nextFilters !== prevFilters;
			const sizeChanged = nextSize !== prevSize;
			const pageChanged = nextPage !== prevPage;
			prevKey = nextKey;
			prevArgs = nextArgs;
			prevFilters = nextFilters;
			prevSize = nextSize;
			prevPage = nextPage;

			if (!started) {
				started = true;
				load('initial', nextPage);
				return;
			}

			// Another list altogether (a new key, another user's rows): start from nothing.
			if (keyChanged || argsChanged) {
				if (argsChanged) loader.updateRouteArgs(args);
				loader.reset();
				currentPage = 1;
				prevPage = 1;
				load('initial', 1);
				return;
			}

			// Filters changed - back to page 1, debounced when asked to be.
			if (filtersChanged) {
				if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);

				const apply = () => {
					currentPage = 1;
					prevPage = 1;
					load('filters', 1);
				};

				if (filterDebounceMs > 0) {
					loadingFilters = true;
					filterDebounceTimeout = setTimeout(apply, filterDebounceMs);
				} else {
					apply();
				}
				return;
			}

			// Page size changed - keep the first visible row on screen, then fetch. The
			// loader only recalculates the page; on page 1 that is no change at all, so the
			// fetch has to be asked for here.
			if (sizeChanged) {
				loader.changePageSize(nextSize);
				currentPage = loader.currentPage;
				prevPage = loader.currentPage;
				load('page', loader.currentPage);
				return;
			}

			if (pageChanged) {
				load('page', nextPage);
			}
		});
	});

	const busy = $derived(loader.loading || loadingInitial || loadingPage || loadingFilters);
	const from = $derived(count === 0 ? 0 : (currentPage - 1) * size + 1);
	const to = $derived(Math.min(currentPage * size, count));
</script>

<div
	class={`fetcher f fw flex-col relative ${className}`}
	data-stale={busy && results.length > 0 ? 'true' : undefined}
	aria-busy={busy}>
	{#if filtersSnippet}
		<div class="fetcher-keep f fw al-c mb-2">
			{@render filtersSnippet()}
		</div>
	{/if}
	{#if loader.error && !busy}
		{#if errorSnippet}
			{@render errorSnippet({ error: loader.error, retry })}
		{:else}
			<SomethingWentWrong onRetry={retry} />
		{/if}
	{:else if results.length > 0}
		<!-- The page already on screen stays up, dimmed, while the next one loads: nothing
		     below it moves. -->
		{@render children({
			results,
			hasMore: loader.hasMore,
			loading: loader.loading,
			loadingInitial,
			loadingPage,
			loadingFilters,
			error: loader.error,
			currentPage,
			count,
			totalPages: loader.totalPages,
			hasPrevious: loader.hasPrevious
		})}
	{:else if busy}
		{#if loadingSnippet}
			{@render loadingSnippet()}
		{:else if showLoader}
			<SkeletonRows count={Math.min(size, 8)} lines={1} trailing boxed={false} class="px-2" />
		{/if}
	{:else if noResultSnippet}
		{@render noResultSnippet()}
	{:else}
		<NoResult />
	{/if}
	<!-- Hide pagination if instructed or no results were available -->
	{#if !(hidePagination || (loader.currentPage === 1 && results.length === 0))}
		<div class="fetcher-keep sticky bottom-0">
			{#if !loader.error}
				<div
					class="bg-card type-meta text-muted-foreground flex min-h-11 items-center gap-3 py-2 pl-4 text-sm">
					<span class="whitespace-nowrap">{from}–{to} / {count}</span>
					<div class="f1"></div>
					{#if loader.totalPages > 1}
						<IconPaginator bind:page={currentPage} bind:perPage={size} bind:count />
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* See SlideFetcher: the stale page steps back and stops taking clicks; the filters
	   and the pager stay live. */
	.fetcher[data-stale='true'] > :global(:not(.fetcher-keep)) {
		opacity: 0.55;
		pointer-events: none;
		transition: opacity 150ms ease;
	}
</style>
