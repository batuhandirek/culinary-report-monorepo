interface ScrollEdgesOptions {
	/** The axis the node scrolls on. */
	axis?: 'x' | 'y';
	/**
	 * A selector for the item that must stay in view (a tab list's active trigger): it is
	 * scrolled to when the node mounts and whenever the active marker moves (`data-state`,
	 * `aria-current`, `aria-selected`).
	 */
	follow?: string;
}

/**
 * Tells a scroller which of its edges still have content behind them, as
 * `data-overflow-start` / `data-overflow-end` on the node. CSS does the rest: the
 * `scroll-fade-x` / `scroll-fade-y` utilities in `app.css` fade the open edge, and a
 * sibling can key a shade off the attribute (`peer-data-[overflow-end]:opacity-100`).
 *
 * Returns its own cleanup, so it works as an action (`use:scrollEdges`) on an element and
 * inside an `$effect` for a component's bound `ref`.
 */
export function scrollEdges(node: HTMLElement, options: ScrollEdgesOptions = {}) {
	const { axis = 'y', follow } = options;
	const horizontal = axis === 'x';

	const update = () => {
		const position = horizontal ? node.scrollLeft : node.scrollTop;
		const max = horizontal
			? node.scrollWidth - node.clientWidth
			: node.scrollHeight - node.clientHeight;
		// A pixel of slack: fractional layouts leave scroll positions off by a hair.
		node.toggleAttribute('data-overflow-start', position > 1);
		node.toggleAttribute('data-overflow-end', position < max - 1);
	};

	// Moves the node's own scroll offset only — `scrollIntoView` would also scroll every
	// scrollable ancestor, i.e. jump the page.
	const reveal = (behavior: ScrollBehavior) => {
		if (!follow) return;
		const target = node.querySelector<HTMLElement>(follow);
		if (!target) return;
		const box = node.getBoundingClientRect();
		const item = target.getBoundingClientRect();
		const margin = 24;
		const before = horizontal ? item.left - box.left : item.top - box.top;
		const after = horizontal ? item.right - box.right : item.bottom - box.bottom;
		let delta = 0;
		if (before < margin) delta = before - margin;
		else if (after > -margin) delta = after + margin;
		if (delta !== 0) {
			node.scrollBy({ [horizontal ? 'left' : 'top']: delta, behavior });
		}
	};

	// The node resizing, its children resizing (an image loads, a row expands) and its
	// children changing all move the edges.
	const resize = new ResizeObserver(update);
	const observeChildren = () => {
		resize.disconnect();
		resize.observe(node);
		for (const child of node.children) resize.observe(child);
	};
	const mutations = new MutationObserver((records) => {
		if (records.some((r) => r.type === 'childList')) observeChildren();
		if (records.some((r) => r.type === 'attributes')) reveal('smooth');
		update();
	});

	node.addEventListener('scroll', update, { passive: true });
	observeChildren();
	mutations.observe(node, {
		childList: true,
		subtree: !!follow,
		attributes: !!follow,
		// What marks "the active one" across tabs, nav links and option lists.
		attributeFilter: follow ? ['data-state', 'aria-current', 'aria-selected'] : undefined
	});
	reveal('instant');
	update();

	const destroy = () => {
		node.removeEventListener('scroll', update);
		resize.disconnect();
		mutations.disconnect();
	};
	// Callable for `$effect` cleanup, and action-shaped for `use:`.
	return Object.assign(destroy, { destroy });
}
