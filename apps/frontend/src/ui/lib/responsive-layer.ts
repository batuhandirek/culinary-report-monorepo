import { getContext, setContext } from 'svelte';

const RESPONSIVE_LAYER = Symbol.for('culinary-report:responsive-layer');

/**
 * Marks everything rendered below as living inside a ResponsiveModal / ResponsivePopover.
 *
 * Below `lg` that ancestor is a vaul drawer, and a second drawer opened inside it has to
 * be a `Drawer.NestedRoot`: a plain `Drawer.Root` there ends up with two drawers fighting
 * over the scroll lock, and dismissing the child takes the parent down with it.
 *
 * Call it unconditionally at init — consumers pair it with `layoutStore.touch`, and both
 * sides read the same store, so they can never disagree about which branch is live.
 */
export function markResponsiveLayer() {
	setContext(RESPONSIVE_LAYER, true);
}

/** True when a ResponsiveModal / ResponsivePopover is an ancestor. Init-time constant. */
export function inResponsiveLayer(): boolean {
	return getContext<true | undefined>(RESPONSIVE_LAYER) === true;
}
