import { browser } from '$app/env';

class AppStore {
	// User-agent based device detection. Empty string on the server so all derived flags
	// stay false during SSR.
	private userAgent = $state(browser ? navigator.userAgent : '');

	// iOS browser detection. Note iPadOS Safari masquerades as desktop ('MacIntel'
	// with touch), so we also treat a touch-capable Mac as iOS.
	isIphoneBrowser = $derived(
		/iPad|iPhone|iPod/.test(this.userAgent) ||
			(/Macintosh/.test(this.userAgent) && browser && navigator.maxTouchPoints > 1)
	);
	isAndroidBrowser = $derived(/Android/.test(this.userAgent));
	isMobileBrowser = $derived(this.isIphoneBrowser || this.isAndroidBrowser);
}

export const appStore = new AppStore();
