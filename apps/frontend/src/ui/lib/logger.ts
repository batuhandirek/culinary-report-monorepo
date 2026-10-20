import { PUBLIC_IS_DEBUG_ENABLED } from '$app/env/public';

const enabled = PUBLIC_IS_DEBUG_ENABLED === 'true';

class Logger {
	constructor(private readonly prefix: string) {}

	log = (...args: unknown[]) => {
		if (!enabled) return;
		console.log(`[${this.prefix}]`, ...args);
	};

	warn = (...args: unknown[]) => {
		if (!enabled) return;
		console.warn(`[${this.prefix}]`, ...args);
	};

	error = (...args: unknown[]) => {
		if (!enabled) return;
		console.error(`[${this.prefix}]`, ...args);
	};
}

export const logFactory = {
	create: (prefix: string) => {
		return new Logger(prefix);
	}
};
