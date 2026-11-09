// Lays a run's tree out left to right: each level a column, each node at the middle of its
// children, the leaves stacked one under another in the order they were started.

export const TREE_NODE_WIDTH = 260;
export const TREE_NODE_HEIGHT = 72;
const GAP_X = 72;
const GAP_Y = 14;

export interface TreeItem {
	id: string;
	parentKey?: string;
}

/** Each node's top-left position, by id; a node whose parent is not in the list starts a tree of its own */
export const layoutTree = (items: TreeItem[]): Map<string, { x: number; y: number }> => {
	const ids = new Set(items.map((i) => i.id));
	const children = new Map<string, string[]>();
	const roots: string[] = [];
	for (const item of items) {
		if (item.parentKey && ids.has(item.parentKey)) {
			const list = children.get(item.parentKey) ?? [];
			list.push(item.id);
			children.set(item.parentKey, list);
		} else roots.push(item.id);
	}
	const positions = new Map<string, { x: number; y: number }>();
	let nextRow = 0;
	// Returns the node's centre row, so its parent can sit at the middle of its children
	const place = (id: string, depth: number): number => {
		const kids = children.get(id) ?? [];
		const row = kids.length
			? (() => {
					const rows = kids.map((kid) => place(kid, depth + 1));
					return (rows[0] + rows[rows.length - 1]) / 2;
				})()
			: nextRow++;
		positions.set(id, { x: depth * (TREE_NODE_WIDTH + GAP_X), y: row * (TREE_NODE_HEIGHT + GAP_Y) });
		return row;
	};
	for (const root of roots) place(root, 0);
	return positions;
};
