import { untrack } from 'svelte';

export interface InitterConfig {
	// Lifecycle hooks
	onSuccess?: () => void;
	onError?: (error: Error) => void;
	onFinally?: () => void;
	onInitStart?: () => void;

	// Timing
	minLoadingTime?: number; // Minimum time to show loading state

	// Initialization
	initFn?: () => Promise<void>; // The initialization function to run
	autoInit?: boolean; // Whether to automatically initialize on mount

	// Debugging
	logName?: string; // Optional name for logging to identify this initter
	enableLogs?: boolean; // Enable console logs for debugging (default: false)
}

export class Initter {
	public loading = $state(false);
	public failed = $state(false);
	public error = $state<Error | null>(null);
	public initted = $state(false);

	private config: InitterConfig;
	private initFn: (() => Promise<void>) | null = null;
	private hasAutoInitRun = $state(false);

	constructor(config: InitterConfig = {}) {
		this.config = config;
		this.initFn = config.initFn ?? null;

		// Auto-initialize if configured
		if (config.autoInit && this.initFn) {
			this.log('Auto-init enabled, scheduling initialization');
			const initFn = this.initFn;
			$effect(() => {
				if (!this.hasAutoInitRun) {
					this.hasAutoInitRun = true;
					untrack(() => {
						this.init(initFn);
					});
				}
			});
		}
	}

	private log(message: string, ...args: unknown[]): void {
		if (this.config.enableLogs) {
			const prefix = this.config.logName ? `[Initter: ${this.config.logName}]` : '[Initter]';
			console.log(`${prefix} ${message}`, ...args);
		}
	}

	private logError(message: string, error?: Error): void {
		if (this.config.enableLogs) {
			const prefix = this.config.logName ? `[Initter: ${this.config.logName}]` : '[Initter]';
			console.error(`${prefix} ${message}`, error);
		}
	}

	private async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	public init = async (fn: () => Promise<void>): Promise<void> => {
		// Store the init function for reinit
		this.initFn = fn;

		this.log('Starting initialization');
		this.loading = true;
		this.failed = false;
		this.error = null;
		this.initted = false;

		this.config.onInitStart?.();

		const startTime = Date.now();

		try {
			await fn();

			const elapsed = Date.now() - startTime;
			this.log(`Initialization completed in ${elapsed}ms`);

			// Apply minimum loading time if configured
			if (this.config.minLoadingTime) {
				if (elapsed < this.config.minLoadingTime) {
					const waitTime = this.config.minLoadingTime - elapsed;
					this.log(`Waiting additional ${waitTime}ms to meet minimum loading time`);
					await this.sleep(waitTime);
				}
			}

			this.initted = true;
			this.log('Initialization successful');
			this.config.onSuccess?.();
		} catch (e) {
			const error = e instanceof Error ? e : new Error(String(e));

			this.logError('Initialization failed', error);
			this.failed = true;
			this.error = error;
			this.initted = false;
			this.config.onError?.(error);
		} finally {
			this.loading = false;
			this.config.onFinally?.();
		}
	};

	public reinit = async (): Promise<void> => {
		if (!this.initFn) {
			this.logError('Cannot reinit: no initialization function stored');
			throw new Error('Cannot reinit: no initialization function stored');
		}
		this.log('Re-initializing');
		await this.init(this.initFn);
	};

	public reset = (): void => {
		this.log('Resetting state');
		this.loading = false;
		this.failed = false;
		this.error = null;
		this.initted = false;
		this.initFn = null;
	};
}

// Factory function for easier usage
export function createInitter(config?: InitterConfig): Initter {
	return new Initter(config);
}
