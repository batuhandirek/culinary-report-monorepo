import { Loader, type LoaderConfig } from './loader.svelte';

export interface PaginatedResponse<Item = unknown> {
	items: Item[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface PaginationRequest {
	page: number;
	size: number;
}

export type PaginatedApi<
	RouteArgs extends unknown[],
	Query extends PaginationRequest,
	Result extends PaginatedResponse
> = (...args: [...RouteArgs, query: Query]) => Promise<Result>;

type PaginationFilters<Query extends PaginationRequest> = Partial<Omit<Query, 'page' | 'size'>>;

export interface PaginatedLoaderConfig<
	Result extends PaginatedResponse
> extends LoaderConfig<Result> {
	onPageChange?: (page: number) => void;
	onItemsChange?: (items: Result['items']) => void;

	initialPage?: number;
	initialPageSize?: number;

	accumulateItems?: boolean;
	prependItems?: boolean;
}

export class PaginatedLoader<
	RouteArgs extends unknown[],
	Query extends PaginationRequest,
	Result extends PaginatedResponse
> {
	private loader: Loader<[...RouteArgs, Query], Result>;
	private config: PaginatedLoaderConfig<Result>;
	private routeArgs: RouteArgs;
	private currentFilters: PaginationFilters<Query> = {};

	// ---------- state ----------
	public items = $state<Result['items']>([]);
	public currentPage = $state(1);
	public requestedPage = $state(1);
	public totalPages = $state(0);
	public pageSize = $state(10);
	public totalItems = $state(0);
	public hasMore = $state(false);
	public hasPrevious = $state(false);

	// ---------- delegated ----------
	public get loading() {
		return this.loader.loading;
	}
	public get failed() {
		return this.loader.failed;
	}
	public get error() {
		return this.loader.error;
	}
	public get lastLoadTime() {
		return this.loader.lastLoadTime;
	}

	constructor(
		api: PaginatedApi<RouteArgs, Query, Result>,
		routeArgs: RouteArgs,
		config: PaginatedLoaderConfig<Result> = {}
	) {
		this.config = config;
		this.routeArgs = routeArgs;

		this.currentPage = config.initialPage ?? 1;
		this.requestedPage = config.initialPage ?? 1;
		this.pageSize = config.initialPageSize ?? 10;

		this.loader = new Loader<[...RouteArgs, Query], Result>(api, {
			...config,
			onSuccess: (result) => {
				this.handleSuccess(result);
				config.onSuccess?.(result);
			}
		});
	}

	// ---------- internals ----------

	private handleSuccess(result: Result) {
		this.currentPage = result.page;
		this.pageSize = result.pageSize;
		this.totalItems = result.totalItems;
		this.totalPages = Math.ceil(result.totalItems / result.pageSize);

		this.hasMore = this.currentPage < this.totalPages;
		this.hasPrevious = this.currentPage > 1;

		if (this.config.accumulateItems) {
			if (this.config.prependItems) {
				this.items = [...result.items].reverse().concat(this.items);
			} else {
				this.items = [...this.items, ...result.items];
			}
		} else {
			this.items = result.items;
		}

		this.config.onPageChange?.(this.currentPage);
		this.config.onItemsChange?.(this.items);
	}

	private buildQuery(page: number, size: number, filters: PaginationFilters<Query>): Query {
		return {
			page,
			size,
			...filters
		} as Query;
	}

	// ---------- public API ----------

	public load = (filters: PaginationFilters<Query> = {}) => {
		this.currentFilters = filters;
		this.requestedPage = this.currentPage;

		const query = this.buildQuery(this.currentPage, this.pageSize, filters);
		return this.loader.load(...this.routeArgs, query);
	};

	public loadPage = (page: number, filters: PaginationFilters<Query> = {}) => {
		this.requestedPage = page;
		this.currentFilters = filters;

		const query = this.buildQuery(page, this.pageSize, filters);
		return this.loader.load(...this.routeArgs, query);
	};

	public reload = () => this.loader.reload();

	public nextPage = () =>
		this.hasMore
			? this.loadPage(this.currentPage + 1, this.currentFilters)
			: Promise.resolve(null);

	public previousPage = () =>
		this.hasPrevious
			? this.loadPage(this.currentPage - 1, this.currentFilters)
			: Promise.resolve(null);

	public changePageSize = (size: number): Promise<Result | null> => {
		if (!Number.isFinite(size) || size < 1) return Promise.resolve(null);

		const firstItemIndex = (this.currentPage - 1) * this.pageSize;
		this.pageSize = size;
		this.currentPage = Math.floor(firstItemIndex / size) + 1;
		this.requestedPage = this.currentPage;

		return Promise.resolve(null);
	};

	/**
	 * Adopt an already-fetched first page (e.g. one rendered by SvelteKit's SSR load) as the
	 * loader's starting state, so hydration doesn't re-request page 1. Pagination continues
	 * from `page`, so `nextPage()` asks for `page + 1`.
	 *
	 * `meta.filters` must describe the query the seed was fetched with. Nothing else sets
	 * `currentFilters` on this path — `load`/`loadPage` never ran — so omitting them makes
	 * `nextPage()` request page 2 of a completely *unfiltered* list: on a category listing
	 * that means scrolling past the first page pulls in ads from every other category, with
	 * none of the `populate` relations the rows need.
	 */
	public seed = (
		items: Result['items'],
		meta: {
			page?: number;
			pageSize?: number;
			totalItems: number;
			filters?: PaginationFilters<Query>;
		}
	) => {
		this.currentFilters = meta.filters ?? {};
		this.items = [...items];
		this.currentPage = meta.page ?? 1;
		this.requestedPage = this.currentPage;
		this.pageSize = meta.pageSize ?? this.pageSize;
		this.totalItems = meta.totalItems;
		this.totalPages = Math.ceil(meta.totalItems / this.pageSize);
		this.hasMore = this.currentPage < this.totalPages;
		this.hasPrevious = this.currentPage > 1;
	};

	public updateRouteArgs = (args: RouteArgs) => {
		this.routeArgs = args;
	};

	public cancel = () => this.loader.cancel();

	public reset = () => {
		this.loader.reset();

		this.items = [];
		this.currentPage = this.config.initialPage ?? 1;
		this.requestedPage = this.config.initialPage ?? 1;
		this.totalPages = 0;
		this.pageSize = this.config.initialPageSize ?? 10;
		this.totalItems = 0;
		this.hasMore = false;
		this.hasPrevious = false;
		this.currentFilters = {};
	};
}

// ---------- factories ----------
export function createPaginatedLoader<
	RouteArgs extends unknown[],
	Query extends PaginationRequest,
	Result extends PaginatedResponse
>(
	api: PaginatedApi<RouteArgs, Query, Result>,
	routeArgs: RouteArgs,
	config?: PaginatedLoaderConfig<Result>
): PaginatedLoader<RouteArgs, Query, Result> {
	return new PaginatedLoader(api, routeArgs, config);
}

export function createAutoPaginatedLoader<
	RouteArgs extends unknown[],
	Query extends PaginationRequest,
	Result extends PaginatedResponse
>(
	api: PaginatedApi<RouteArgs, Query, Result>,
	routeArgs: RouteArgs,
	filters: PaginationFilters<Query> = {},
	config?: PaginatedLoaderConfig<Result>
): PaginatedLoader<RouteArgs, Query, Result> {
	const loader = new PaginatedLoader(api, routeArgs, config);
	loader.loadPage(config?.initialPage ?? 1, filters);
	return loader;
}
