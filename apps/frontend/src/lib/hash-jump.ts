import { afterNavigate, replaceState } from '$app/navigation';
import { page } from '$app/state';

/**
 * In-page jumps (`/s/nasil-calisir#guvenli-odeme`, a table of contents) on long-form pages.
 *
 * A plain `href="#id"` is not enough here: on a phone the page scrolls inside `main`, and
 * the `(app)` layout's `afterNavigate` puts `main` back at the top after the browser has
 * already scrolled to the anchor. `scrollIntoView` works in whichever container scrolls;
 * give the targets a `scroll-margin-top` so they clear the sticky header.
 */
export const scrollToId = (id: string, behavior: ScrollBehavior = 'auto') => {
	if (!id) return false;
	const target = document.getElementById(id);
	if (!target) return false;
	target.scrollIntoView({ behavior, block: 'start' });
	return true;
};

/**
 * Call once in the script of a layout whose pages take `#hash` links. Runs after the
 * `(app)` layout's own reset (child callbacks fire later), on arrival and on every
 * navigation into the group.
 */
export const keepHashInView = () => {
	// Straight away, not on the next frame: the page is mounted by now, and a deferred
	// jump can land after the visitor has already moved on to another section.
	afterNavigate(() => {
		scrollToId(decodeURIComponent(page.url.hash.slice(1)));
	});
};

/**
 * `onclick` for a link that points inside the page it is on. Keep the real `href="#id"`
 * on the link: it is what a crawler and "copy link" see.
 */
export const jumpTo = (id: string) => (event: MouseEvent) => {
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	if (!scrollToId(id, 'smooth')) return;
	event.preventDefault();
	// Shallow: the address gains the hash without a navigation that would reset the scroll.
	replaceState(`#${id}`, page.state);
};
