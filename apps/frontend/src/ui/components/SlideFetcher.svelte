<script
	lang="ts"
	generics="T extends { items: unknown[], page: number, pageSize: number, totalItems: number}">
	import { RotateCw } from '@lucide/svelte';
	import { nanoid } from 'nanoid';
	import { type Snippet, untrack } from 'svelte';

	import NoResult from './NoResult.svelte';
	import SomethingWentWrong from './SomethingWentWrong.svelte';
	import Spinner from './Spinner.svelte';

	import { logFactory } from '#ui/lib/logger.js';
	import { createPaginatedLoader } from '#ui/lib/paginated-loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import SkeletonCard from '#ui/wrapped/SkeletonCard.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	interface SnippetState {
		results: T['items'];
		hasMore: boolean;
		loading: boolean;
		loadingMore: boolean;
		error: Error | null;
		totalItems: number;
	}

	interface Props {
		// For fetching
		// Generated client methods each have their own parameter list; `any` is what lets
		// one prop take all of them.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		api: (...args: any[]) => Promise<T>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		args?: any[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		filters?: any;
		size?: number;
		key?: string;
		/**
		 * Already-fetched first page (typically from a SvelteKit SSR `load`). When given, the
		 * list renders those items server-side and hydration skips the page-1 request —
		 * infinite scroll resumes at `initialPage + 1`. Filter/key/args changes still reload
		 * from page 1 as usual.
		 */
		initialItems?: T['items'];
		initialTotalItems?: number;
		initialPage?: number;

		// Config
		/** Draw the first load: a skeleton in the shape `skeleton` names. Off, nothing is drawn. */
		showLoader?: boolean;
		/**
		 * The shape of the default first-load placeholder: list rows, a photo-card grid, or
		 * the old centred spinner. `loadingSnippet` replaces it altogether.
		 */
		skeleton?: 'rows' | 'cards' | 'spinner';
		/** A quiet line under the last item, once more than one page has been scrolled through. */
		endText?: string;
		intersectionThreshold?: number; // How far from bottom to trigger (0-1)
		intersectionRootMargin?: string; // Root margin for intersection observer
		prependItems?: boolean;
		class?: string;

		// Snippets
		children: Snippet<[SnippetState]>;
		filtersSnippet?: Snippet<[SnippetState]>;
		noResult?: Snippet;
		errorSnippet?: Snippet<[{ error: Error; retry: () => Promise<void> }]>;
		/** First-load placeholder shaped like the content. Drawn whether or not `showLoader` is set. */
		loadingSnippet?: Snippet;
		loadingMore?: Snippet;

		// State
		results?: T['items'];
		totalItems?: number;
		/** True while (re)loading the first page — initial load, key/filter change, or reload(). */
		loading?: boolean;

		// Hooks
		onFetch?: (r: T['items']) => void;
		onLoadMore?: () => void;
	}

	let {
		api,
		args = [],
		filters = $bindable({}),
		size = $bindable(10),
		key = nanoid(),
		initialItems,
		initialTotalItems,
		initialPage = 1,

		showLoader = false,
		skeleton = 'rows',
		endText = undefined,
		prependItems = false,
		intersectionThreshold = 0.1,
		intersectionRootMargin = '100px',
		class: className = '',

		children,
		filtersSnippet,
		noResult,
		errorSnippet,
		loadingSnippet,
		loadingMore: loadingMoreSnippet,

		results = $bindable([]),
		totalItems = $bindable(0),
		loading = $bindable(false),

		onFetch = undefined,
		onLoadMore = undefined
	}: Props = $props();

	const log = logFactory.create('SlideFetcher');
	const seeded = Boolean(initialItems?.length);

	// Loading state tracking
	let loadingInitial = $state(!seeded);
	let loadingMore = $state(false);
	// What stays on screen while the *same* list is asked again (a filter change, `reload()`):
	// the page it already shows, dimmed, rather than a blank that makes everything below
	// it jump. A different list (`key`, `args`) never keeps the old one.
	let stale = $state<{ items: T['items']; totalItems: number } | null>(null);

	const loader = createPaginatedLoader(api, args, {
		initialPage: 1,
		initialPageSize: size,
		accumulateItems: true,
		prependItems,
		onError: log.error,
		onSuccess: (result) => {
			onFetch?.(result.items);
		}
	});

	if (seeded) {
		loader.seed(initialItems!, {
			page: initialPage,
			pageSize: size,
			totalItems: initialTotalItems ?? initialItems!.length,
			// The query the caller's seed was fetched with. Without it `nextPage()` would ask
			// for page 2 of an unfiltered list — see `PaginatedLoader.seed`.
			filters
		});
		// Assigned here rather than in the sync effect below so the seeded page is present
		// during SSR, where effects never run.
		results = loader.items;
		totalItems = loader.totalItems;
	}

	// Sync loader state with bindable props
	$effect(() => {
		results = stale ? stale.items : loader.items;
		totalItems = stale ? stale.totalItems : loader.totalItems;
		loading = loadingInitial;
	});

	// Intersection observer element
	let observerTarget: HTMLDivElement | null = $state(null);
	let isIntersecting = $state(false);

	// Setup intersection observer
	$effect(() => {
		if (!observerTarget) return;

		const observer = new IntersectionObserver(
			(entries) => {
				isIntersecting = entries[0].isIntersecting;
			},
			{
				threshold: intersectionThreshold,
				rootMargin: intersectionRootMargin
			}
		);

		observer.observe(observerTarget);

		return () => {
			observer.disconnect();
			isIntersecting = false;
		};
	});

	// Load the next page when the sentinel scrolls into view. Not after a failure: the
	// sentinel is still on screen then, and retrying on our own would hammer the API —
	// the row below offers the retry instead.
	$effect(() => {
		if (isIntersecting && loader.hasMore && !loader.loading && !loader.error) {
			loadMore();
		}
	});

	// Each first-page load takes a ticket; only the newest may clear the flags. Without it
	// a superseded response (two quick filter changes) lands first, drops `loadingInitial`
	// and flashes the empty state while the real request is still in flight.
	let ticket = 0;

	const loadFirstPage = async (keepStale: boolean) => {
		const mine = ++ticket;
		if (!keepStale) {
			stale = null;
		} else if (loader.items.length > 0) {
			stale = { items: loader.items, totalItems: loader.totalItems };
		}
		loader.reset();
		loadingInitial = true;
		try {
			await loader.loadPage(1, filters);
		} finally {
			if (mine === ticket) {
				loadingInitial = false;
				stale = null;
			}
		}
	};

	// What the last load was asked with. Plain variables: they are bookkeeping for the
	// effect below, nothing renders from them.
	let prevFilters = JSON.stringify(filters);
	let prevKey = key;
	let prevArgs = JSON.stringify(args);
	let started = seeded;

	// Handle reactive changes
	$effect(() => {
		const currentFilters = JSON.stringify(filters);
		const currentArgs = JSON.stringify(args);
		const currentKey = key;

		untrack(() => {
			const keyChanged = currentKey !== prevKey;
			const argsChanged = currentArgs !== prevArgs;
			const filtersChanged = currentFilters !== prevFilters;
			prevKey = currentKey;
			prevArgs = currentArgs;
			prevFilters = currentFilters;

			if (argsChanged) loader.updateRouteArgs(args);

			if (!started || keyChanged || argsChanged) {
				// A list we have not shown yet (first load, another thread, another user).
				started = true;
				loadFirstPage(false);
			} else if (filtersChanged) {
				loadFirstPage(true);
			}
		});
	});

	// Reload from the first page. Awaitable so callers (e.g. pull-to-refresh) can keep an
	// indicator visible until the data arrives; the current items stay up meanwhile.
	export async function reload() {
		await loadFirstPage(true);
	}

	// Manual load more function
	async function loadMore() {
		if (!loader.hasMore || loader.loading) return;

		loadingMore = true;
		onLoadMore?.();

		try {
			await loader.nextPage();
		} finally {
			loadingMore = false;
		}
	}

	const snippetState = $derived<SnippetState>({
		results,
		hasMore: loader.hasMore,
		loading: loader.loading,
		loadingMore,
		error: loader.error,
		totalItems
	});
</script>

<div
	class={`fetcher f fw flex-col relative ${className}`}
	data-stale={stale ? 'true' : undefined}
	aria-busy={loadingInitial || loadingMore}>
	{#if filtersSnippet}
		<div class="fetcher-filters f fw al-c mb-2">
			{@render filtersSnippet(snippetState)}
		</div>
	{/if}

	{#if results.length > 0}
		{@render children(snippetState)}

		{#if loader.hasMore}
			{#if loader.error && !loader.loading}
				<!-- The next page failed: say so and wait to be asked, with the list still up. -->
				<div
					class="text-muted-foreground flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 py-4 text-sm"
					role="alert">
					Devamı yüklenemedi.
					<Button variant="outline" size="sm" icon={RotateCw} onclick={loadMore}>
						Tekrar dene
					</Button>
				</div>
			{:else}
				<!-- Intersection observer target -->
				<div bind:this={observerTarget} class="flex w-full justify-center py-4">
					{#if loadingMore}
						{#if loadingMoreSnippet}
							{@render loadingMoreSnippet()}
						{:else}
							<Spinner size={24} class="text-muted-foreground" />
						{/if}
					{/if}
				</div>
			{/if}
		{:else if endText && loader.currentPage > 1 && !stale}
			<p class="font-term text-muted-foreground m-0 w-full py-4 text-center text-base">
				{endText}
			</p>
		{/if}
	{:else if loadingInitial}
		{#if loadingSnippet}
			{@render loadingSnippet()}
		{:else if showLoader}
			{#if skeleton === 'cards'}
				<div class="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
					<SkeletonCard count={Math.min(size, 8)} />
				</div>
			{:else if skeleton === 'spinner'}
				<div class="f fw cc min-h-32 py-8">
					<Spinner size={32} class="text-muted-foreground" />
				</div>
			{:else}
				<SkeletonRows count={Math.min(size, 4)} />
			{/if}
		{/if}
	{:else if loader.error}
		{#if errorSnippet}
			{@render errorSnippet({ error: loader.error, retry: reload })}
		{:else}
			<SomethingWentWrong onRetry={reload} />
		{/if}
	{:else if noResult}
		{@render noResult()}
	{:else}
		<NoResult />
	{/if}
</div>

<style>
	/* A refresh keeps the last page on screen; it steps back so the eye reads "updating",
	   and stops taking taps meant for rows that are about to change. The filters stay
	   live — they are what the visitor is working. */
	.fetcher[data-stale='true'] > :global(:not(.fetcher-filters)) {
		opacity: 0.55;
		pointer-events: none;
		transition: opacity 150ms ease;
	}
</style>
