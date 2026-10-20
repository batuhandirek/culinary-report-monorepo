/**
 * Publishes the on-screen keyboard's height as `--keyboard-inset` on `<html>`.
 *
 * `position: fixed` elements are anchored to the *layout* viewport, and iOS never shrinks
 * that viewport for the keyboard — neither Safari nor the Capacitor WKWebView — so a
 * bottom sheet sized in `dvh` keeps its full height and ends up half-buried behind the
 * keyboard. `visualViewport` is the only API that reports the covered strip on both
 * platforms; on Android the WebView resizes the layout viewport instead, so the value
 * stays at 0 and callers get the same result without a special case.
 */
let started = false;

// Collapsing browser chrome and pinch zoom also move the visual viewport, by far less
// than any software keyboard. Anything under this is chrome, and lifting a sheet for it
// would leave a gap under the sheet on every scroll.
const KEYBOARD_MIN_HEIGHT = 120;

// The property is inherited by the whole document, so every write invalidates style
// tree-wide and relayouts whatever sizes off it. `visualViewport` scroll fires per frame
// while iOS collapses its chrome, and the value is 0 for all of it — write on change only,
// or the steady state is a full recalc per frame to rewrite `0px` as `0px`.
let lastInset = -1;

function measure() {
	const vv = window.visualViewport;
	if (!vv) return;
	// `offsetTop` is non-zero while iOS has scrolled the visual viewport itself (pinch
	// zoom, or its own scroll-to-reveal on focus); without it the inset over-reports.
	const covered = Math.round(window.innerHeight - vv.height - vv.offsetTop);
	const inset = covered >= KEYBOARD_MIN_HEIGHT ? covered : 0;
	if (inset === lastInset) return;
	lastInset = inset;
	document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
}

export function initKeyboardInset() {
	const vv = typeof window === 'undefined' ? null : window.visualViewport;
	if (!vv || started) return;
	started = true;

	let frame = 0;
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(measure);
	};

	vv.addEventListener('resize', schedule, { passive: true });
	vv.addEventListener('scroll', schedule, { passive: true });
	schedule();
}
