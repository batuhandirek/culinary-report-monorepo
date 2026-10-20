declare global {
	namespace App {
		// `message` is all SvelteKit's own `error(404)` carries; the rest comes with a
		// backend exception, so a bare `error(status)` must still type-check.
		interface Error {
			message: string;
			debugId?: string;
			name?: string;
			details?: string[];
			code?: string;
			status?: number;
		}
		interface PageState {
			shallowAdId?: string;
		}
	}
}

export {};
