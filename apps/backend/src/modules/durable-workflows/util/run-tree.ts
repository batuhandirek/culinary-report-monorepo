import type { RunTreeRow } from '../services/durable-run-tree.service.js';

/** More children of one workflow under one parent than this are drawn as one node with counts */
export const RUN_TREE_GROUP_ABOVE = 6;

export interface RunTreeRunNode {
	kind: 'run';
	row: RunTreeRow;
	/** The node it hangs under; none for the tree's top */
	parentKey?: string;
}

/** Several runs of one workflow under one parent, folded: how many, in which status */
export interface RunTreeGroupNode {
	kind: 'group';
	/** `<parent id>/<className>.<name>` */
	key: string;
	parentKey: string;
	parentId: string;
	name: string;
	className: string;
	count: number;
	statuses: { status: string; count: number }[];
}

export type RunTreeNode = RunTreeRunNode | RunTreeGroupNode;

/**
 * The tree under `rootId` as nodes to draw: each run under the run that started it, and a
 * parent's children of one workflow folded into a group node once there are more than
 * `groupAbove` of them (a city's thousand post reads, each with its agent calls, is one node
 * saying how many are done). What is under a folded run is left out; its own page draws it.
 */
export const buildRunTree = (
	rootId: string,
	rows: RunTreeRow[],
	groupAbove = RUN_TREE_GROUP_ABOVE,
): RunTreeNode[] => {
	const root = rows.find(r => r.id === rootId);
	if (!root) return [];
	const children = new Map<string, RunTreeRow[]>();
	for (const row of rows) {
		if (!row.parentId || row.id === rootId) continue;
		const list = children.get(row.parentId) ?? [];
		list.push(row);
		children.set(row.parentId, list);
	}
	const nodes: RunTreeNode[] = [{ kind: 'run', row: root }];
	const visit = (parent: RunTreeRow) => {
		const byWorkflow = new Map<string, RunTreeRow[]>();
		for (const child of children.get(parent.id) ?? []) {
			const key = `${child.className}.${child.name}`;
			byWorkflow.set(key, [...(byWorkflow.get(key) ?? []), child]);
		}
		for (const [workflow, runs] of byWorkflow) {
			if (runs.length > groupAbove) {
				const counts = new Map<string, number>();
				for (const run of runs) counts.set(run.status, (counts.get(run.status) ?? 0) + 1);
				nodes.push({
					kind: 'group',
					key: `${parent.id}/${workflow}`,
					parentKey: parent.id,
					parentId: parent.id,
					name: runs[0].name,
					className: runs[0].className,
					count: runs.length,
					statuses: [...counts].map(([status, count]) => ({ status, count })),
				});
				continue;
			}
			for (const run of runs) {
				nodes.push({ kind: 'run', row: run, parentKey: parent.id });
				visit(run);
			}
		}
	};
	visit(root);
	return nodes;
};
