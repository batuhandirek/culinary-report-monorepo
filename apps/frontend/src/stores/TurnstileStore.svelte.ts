import { browser } from '$app/env';
import { PUBLIC_TURNSTILE_SITE_KEY } from '$app/env/public';

/** Read by the backend TurnstileGuard (modules/turnstile/guards/turnstile.guard.ts). */
export const TURNSTILE_TOKEN_HEADER = 'CULINARY-REPORT-TURNSTILE-TOKEN';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** How long to wait for a non-interactive token before failing open. */
const TOKEN_TIMEOUT_MS = 8000;

interface TurnstileApi {
	render: (el: HTMLElement, params: Record<string, unknown>) => string | undefined;
	remove: (widgetId: string) => void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

/**
 * On-demand Cloudflare Turnstile tokens for bot-sensitive endpoints.
 *
 * Usage at a call site (tokens are single-use, so fetch a fresh one per request):
 *
 *   api.auth.loginWithEmail(body, await turnstileStore.getHeaders('login'));
 *
 * The widget renders invisibly (appearance: interaction-only) into the container
 * provided by `TurnstileHost.svelte` (mounted in the root layout); if Cloudflare
 * decides the user must interact, the host shows a blocking overlay for the
 * duration of the challenge.
 *
 * Fails open (returns no header) when the widget can't load — the backend guard
 * runs in tolerant mode while clients without tokens exist.
 */
class TurnstileStore {
	/** True while Cloudflare needs the user to interact — TurnstileHost shows its overlay. */
	interactive = $state(false);

	readonly isEnabled = !!PUBLIC_TURNSTILE_SITE_KEY;

	private container: HTMLElement | null = null;
	private widgetId: string | null = null;
	private scriptPromise: Promise<TurnstileApi | null> | null = null;
	/** Serializes token requests — the single widget produces one token at a time. */
	private queue: Promise<unknown> = Promise.resolve();

	registerContainer = (el: HTMLElement) => {
		this.container = el;
	};

	unregisterContainer = () => {
		this.removeWidget();
		this.container = null;
	};

	/** Resolves to a fresh single-use token, or null when unavailable (fail open). */
	getToken = async (action?: string): Promise<string | null> => {
		if (!this.isEnabled || !browser) return null;
		const run = this.queue.then(() => this.renderAndSolve(action).catch(() => null));
		this.queue = run;
		return run;
	};

	/** RequestParams fragment for the generated api client. */
	getHeaders = async (action?: string): Promise<{ headers: Record<string, string> }> => {
		const token = await this.getToken(action);
		return { headers: token ? { [TURNSTILE_TOKEN_HEADER]: token } : {} };
	};

	private renderAndSolve = async (action?: string): Promise<string | null> => {
		const turnstile = await this.loadScript();
		const container = this.container;
		if (!turnstile || !container) return null;

		return new Promise<string | null>((resolve) => {
			let settled = false;
			// Fail open if no token arrives and no challenge is being shown.
			let timer: ReturnType<typeof setTimeout> | null = setTimeout(
				() => settle(null),
				TOKEN_TIMEOUT_MS
			);
			const settle = (token: string | null) => {
				if (settled) return;
				settled = true;
				if (timer) clearTimeout(timer);
				this.interactive = false;
				resolve(token);
			};

			try {
				// Widget params (incl. action + callbacks) are fixed at render
				// time, so render a fresh widget per token request.
				this.removeWidget();
				const widgetId = turnstile.render(container, {
					sitekey: PUBLIC_TURNSTILE_SITE_KEY,
					action,
					appearance: 'interaction-only',
					'response-field': false,
					callback: (token: string) => settle(token),
					'error-callback': () => {
						settle(null);
						return true; // suppress Turnstile's own error logging
					},
					'timeout-callback': () => settle(null),
					'before-interactive-callback': () => {
						// User is solving a challenge — stop the fail-open timer.
						if (timer) clearTimeout(timer);
						timer = null;
						this.interactive = true;
					}
				});
				this.widgetId = widgetId ?? null;
				if (!widgetId) settle(null);
			} catch {
				settle(null);
			}
		});
	};

	private removeWidget = () => {
		if (this.widgetId) {
			try {
				window.turnstile?.remove(this.widgetId);
			} catch {}
			this.widgetId = null;
		}
	};

	private loadScript = (): Promise<TurnstileApi | null> => {
		if (!this.scriptPromise) {
			this.scriptPromise = new Promise<TurnstileApi | null>((resolve) => {
				if (window.turnstile) return resolve(window.turnstile);
				const script = document.createElement('script');
				script.src = SCRIPT_SRC;
				script.async = true;
				script.onload = () => resolve(window.turnstile ?? null);
				script.onerror = () => resolve(null);
				document.head.appendChild(script);
			}).then((api) => {
				// Don't cache a failed load — retry on the next token request.
				if (!api) this.scriptPromise = null;
				return api;
			});
		}
		return this.scriptPromise;
	};
}

export const turnstileStore = new TurnstileStore();
