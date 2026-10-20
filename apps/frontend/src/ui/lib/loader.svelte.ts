import { api as baseApi } from '#lib/api.js';

export type AsyncFunction<Args extends unknown[], Result> = (...args: Args) => Promise<Result>;

export interface LoaderConfig<T> {
	// Lifecycle hooks
	onSuccess?: (result: T) => void;
	onError?: (error: Error) => void;
	onFinally?: () => void;
	onLoadStart?: () => void;

	// Debouncing/Throttling
	debounce?: number;
	throttle?: number;

	// Timing
	minLoadingTime?: number;
}

/** Retains the async operation's argument tuple and resolved result type. */
export class Loader<Args extends unknown[], Result> {
	public loading = $state(false);
	public failed = $state(false);
	public error = $state<Error | null>(null);
	public result = $state<Result | null>(null);
	public lastLoadTime = $state<number | null>(null);

	private config: LoaderConfig<Result>;
	private lastArgs: Args | null = null;

	private requestId = 0;
	private currentRequestId = 0;
	private currentCancelToken: string | null = null;

	private debouncedLoad: ((...args: Args) => Promise<Result | null>) | null = null;
	private throttledLoad: ((...args: Args) => Promise<Result | null>) | null = null;

	private lastThrottleTime = 0;

	constructor(
		private api: AsyncFunction<Args, Result>,
		config: LoaderConfig<Result> = {}
	) {
		this.config = config;

		if (this.config.debounce) {
			this.debouncedLoad = this.debounce(this._load.bind(this), this.config.debounce);
		}

		if (this.config.throttle) {
			this.throttledLoad = this.throttle(this._load.bind(this), this.config.throttle);
		}
	}

	// ---------- utils ----------

	private debounce(
		func: (...args: Args) => Promise<Result | null>,
		wait: number
	): (...args: Args) => Promise<Result | null> {
		let timeout: ReturnType<typeof setTimeout> | null = null;

		return (...args: Args) =>
			new Promise((resolve) => {
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => resolve(func(...args)), wait);
			});
	}

	private throttle(
		func: (...args: Args) => Promise<Result | null>,
		wait: number
	): (...args: Args) => Promise<Result | null> {
		return (...args: Args) => {
			const now = Date.now();

			if (now - this.lastThrottleTime >= wait) {
				this.lastThrottleTime = now;
				return func(...args);
			}

			return Promise.resolve(this.result);
		};
	}

	private sleep(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

	// ---------- core ----------

	private async _load(...args: Args): Promise<Result | null> {
		this.lastArgs = args;

		const thisRequestId = ++this.requestId;
		this.currentRequestId = thisRequestId;

		// cancel previous
		if (this.currentCancelToken) {
			try {
				baseApi.abortRequest(this.currentCancelToken);
			} catch {}
		}

		const cancelToken = `loader_${Date.now()}_${thisRequestId}`;
		this.currentCancelToken = cancelToken;

		this.loading = true;
		this.failed = false;
		this.error = null;

		this.config.onLoadStart?.();

		const startTime = Date.now();

		try {
			// ⚠️ If your API expects cancelToken, you can inject it here
			const res = await this.api(...args);

			if (thisRequestId !== this.currentRequestId) return null;

			if (this.config.minLoadingTime) {
				const elapsed = Date.now() - startTime;
				if (elapsed < this.config.minLoadingTime) {
					await this.sleep(this.config.minLoadingTime - elapsed);
				}
			}

			this.result = res;
			this.lastLoadTime = Date.now();

			this.config.onSuccess?.(res);
			return res;
		} catch (e) {
			if (thisRequestId !== this.currentRequestId) return null;

			const error = e instanceof Error ? e : new Error(String(e));

			this.failed = true;
			this.error = error;
			this.result = null;

			this.config.onError?.(error);
			return null;
		} finally {
			if (thisRequestId === this.currentRequestId) {
				this.loading = false;
				this.currentCancelToken = null;
				this.config.onFinally?.();
			}
		}
	}

	// ---------- public API ----------

	public load = (...args: Args): Promise<Result | null> => {
		if (this.debouncedLoad) return this.debouncedLoad(...args);
		if (this.throttledLoad) return this.throttledLoad(...args);
		return this._load(...args);
	};

	public reload = (): Promise<Result | null> => {
		if (!this.lastArgs) return Promise.resolve(null);

		if (this.debouncedLoad) return this.debouncedLoad(...this.lastArgs);
		if (this.throttledLoad) return this.throttledLoad(...this.lastArgs);
		return this._load(...this.lastArgs);
	};

	public cancel = (): void => {
		if (this.currentCancelToken) {
			try {
				baseApi.abortRequest(this.currentCancelToken);
			} catch {}
			this.currentCancelToken = null;
			this.loading = false;
		}
	};

	public reset = (): void => {
		this.cancel();
		this.failed = false;
		this.error = null;
		this.result = null;
		this.lastLoadTime = null;
		this.lastArgs = null;
	};
}

// ---------- factories ----------

export function createLoader<Args extends unknown[], Result>(
	api: AsyncFunction<Args, Result>,
	config?: LoaderConfig<Result>
): Loader<Args, Result> {
	return new Loader(api, config);
}

export function createAutoLoader<Args extends unknown[], Result>(
	api: AsyncFunction<Args, Result>,
	args: Args,
	config?: LoaderConfig<Result>
): Loader<Args, Result> {
	const loader = new Loader(api, config);
	loader.load(...args);
	return loader;
}
