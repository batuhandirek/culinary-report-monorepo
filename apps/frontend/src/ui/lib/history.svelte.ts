import { type AfterNavigate, afterNavigate, beforeNavigate, goto } from '$app/navigation';

export type HistoryEntry = { url: URL; routeId: string | null };

class LocalHistory {
	history = $state<HistoryEntry[]>([]);

	get current(): HistoryEntry | null {
		return this.history[this.history.length - 1] ?? null;
	}

	get previous(): HistoryEntry | null {
		return this.history.length > 1 ? this.history[this.history.length - 2] : null;
	}

	get canGoBack(): boolean {
		return this.previous !== null;
	}

	/**
	 * The back key of a pushed screen: the page before this one when the session has one,
	 * otherwise `fallback` (one level up) — a screen opened from a link, a notification or
	 * a refresh still has a way out, and a bare `history.back()` would leave the app.
	 */
	back = (fallback: string) => {
		if (this.canGoBack) history.back();
		else goto(fallback);
	};

	isPrevious = (link: string): boolean => {
		if (!this.previous) return false;
		const target = new URL(link, this.previous.url);
		return this.previous.url.pathname === target.pathname;
	};

	init = () => {
		beforeNavigate(this.beforeNavigate);
		afterNavigate(this.afterNavigate);
	};

	beforeNavigate = () => {};

	afterNavigate = (nav: AfterNavigate) => {
		if (!nav.to) return;

		const entry: HistoryEntry = {
			url: nav.to.url,
			routeId: nav.to.route.id
		};

		if (nav.type === 'enter') {
			this.history = [entry];
			return;
		}

		if (nav.type === 'popstate' && typeof nav.delta === 'number') {
			const next = this.history.length + nav.delta;
			if (nav.delta < 0 && next > 0) {
				this.history = this.history.slice(0, next);
				return;
			}
		}

		this.history.push(entry);
	};

	reset = () => {
		this.history = [];
	};
}

export const localHistory = new LocalHistory();
