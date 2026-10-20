import { PersistedState } from 'runed';

import { browser } from '$app/env';

const BREAKPOINTS = {
	mobile: [0, 768],
	tablet: [769, 1023],
	desktop: [1024, 1280],
	widescreen: [1281, 9999999],
	touch: [0, 1023],
	computer: [1024, 9999999]
} as const;

type Device = 'mobile' | 'tablet' | 'desktop' | 'widescreen';
type DeviceType = 'touch' | 'computer';

const inRange = (width: number, range: readonly [number, number]) =>
	width >= range[0] && width <= range[1];

class LayoutStore {
	width = $state(browser ? window.innerWidth : 0);
	fullscreen = $state(false);

	// Admin sidebar: collapsed = icons-only (desktop), mobileOpen = Sheet drawer (touch).
	#adminSidebarCollapsed = new PersistedState('admin:sidebarCollapsed', false);
	adminSidebarMobileOpen = $state(false);

	get adminSidebarCollapsed() {
		return this.#adminSidebarCollapsed.current;
	}
	set adminSidebarCollapsed(value: boolean) {
		this.#adminSidebarCollapsed.current = value;
	}

	mobile = $derived(inRange(this.width, BREAKPOINTS.mobile));
	tablet = $derived(inRange(this.width, BREAKPOINTS.tablet));
	desktop = $derived(inRange(this.width, BREAKPOINTS.desktop));
	widescreen = $derived(inRange(this.width, BREAKPOINTS.widescreen));
	touch = $derived(inRange(this.width, BREAKPOINTS.touch));
	computer = $derived(inRange(this.width, BREAKPOINTS.computer));

	device = $derived<Device>(
		this.mobile ? 'mobile' : this.tablet ? 'tablet' : this.desktop ? 'desktop' : 'widescreen'
	);
	deviceType = $derived<DeviceType>(this.touch ? 'touch' : 'computer');

	handleResize = () => {
		if (!browser) return;
		this.width = window.innerWidth;
	};

	// On desktop the toggle collapses to icons-only; on touch it opens the Sheet drawer.
	toggleAdminSidebar = () => {
		if (this.computer) {
			this.adminSidebarCollapsed = !this.adminSidebarCollapsed;
		} else {
			this.adminSidebarMobileOpen = !this.adminSidebarMobileOpen;
		}
	};
}

export const layoutStore = new LayoutStore();
