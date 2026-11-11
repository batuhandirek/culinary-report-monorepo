// Pure: a kind of food's neighbourhood in the topic graph, laid out top-down. Above the topic,
// everything it counts for (its edges, then theirs), each on the row of its longest way up so an
// edge always points up; below it, the topics that count for it directly (kinds of it, then those
// that have it, the most worded first), wrapped into rows. Edges run from the topic that is or
// has to the one it is or has, as the topic's own `edges` state them.

export const GRAPH_NODE_WIDTH = 176;
export const GRAPH_NODE_HEIGHT = 52;
const GAP_X = 20;
/** Between two levels of the graph */
const GAP_Y = 76;
/** Between two wrapped rows of the topics under it */
const GAP_WRAP = 18;
const PER_ROW = 6;
/** The topics under it drawn at most; the rest are counted */
export const GRAPH_MAX_BELOW = 24;

export interface GraphTopic {
	key: string;
	label: string;
	kind: string;
	/** Wordings whose main topic it is */
	terms: number;
	edges: { to: string; type: string }[];
}

export interface GraphNode {
	key: string;
	label: string;
	kind: string;
	terms: number;
	place: 'current' | 'above' | 'below';
	x: number;
	y: number;
}

export interface GraphEdge {
	from: string;
	to: string;
	type: string;
}

export interface TopicGraphLayout {
	nodes: GraphNode[];
	edges: GraphEdge[];
	/** Topics that count for it directly but were not drawn */
	moreBelow: number;
}

/** A row's x positions, centred on 0 */
const row = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * (GRAPH_NODE_WIDTH + GAP_X) - GRAPH_NODE_WIDTH / 2);

export const topicGraphLayout = (key: string, topics: GraphTopic[]): TopicGraphLayout | null => {
	const byKey = new Map(topics.map((t) => [t.key, t]));
	const current = byKey.get(key);
	if (!current) return null;

	// The longest way up from the topic to each topic it counts for (the graph has no loops; the
	// depth cap only guards a bad row)
	const level = new Map<string, number>([[key, 0]]);
	const walk = (from: string, depth: number) => {
		if (depth > 12) return;
		for (const e of byKey.get(from)?.edges ?? []) {
			if (!byKey.has(e.to) || e.to === key) continue;
			if ((level.get(e.to) ?? 0) < depth + 1) {
				level.set(e.to, depth + 1);
				walk(e.to, depth + 1);
			}
		}
	};
	walk(key, 0);
	const top = Math.max(0, ...level.values());

	const below = topics
		.filter((t) => t.key !== key && !level.has(t.key) && t.edges.some((e) => e.to === key))
		.map((t) => ({ topic: t, type: t.edges.find((e) => e.to === key && e.type === 'is_a') ? 'is_a' : 'has' }))
		.sort(
			(a, b) =>
				(a.type === 'is_a' ? 0 : 1) - (b.type === 'is_a' ? 0 : 1) ||
				b.topic.terms - a.topic.terms ||
				a.topic.label.localeCompare(b.topic.label)
		);
	const shown = below.slice(0, GRAPH_MAX_BELOW);

	const nodes: GraphNode[] = [];
	const at = (t: GraphTopic, place: GraphNode['place'], x: number, y: number) =>
		nodes.push({ key: t.key, label: t.label, kind: t.kind, terms: t.terms, place, x, y });
	const step = GRAPH_NODE_HEIGHT + GAP_Y;
	for (let l = top; l >= 0; l--) {
		const keys = [...level].filter(([, v]) => v === l).map(([k]) => byKey.get(k)!);
		keys.sort((a, b) => a.label.localeCompare(b.label));
		const xs = row(keys.length);
		keys.forEach((t, i) => at(t, l === 0 ? 'current' : 'above', xs[i], (top - l) * step));
	}
	for (let r = 0; r * PER_ROW < shown.length; r++) {
		const part = shown.slice(r * PER_ROW, (r + 1) * PER_ROW);
		const xs = row(part.length);
		part.forEach(({ topic }, i) => at(topic, 'below', xs[i], (top + 1) * step + r * (GRAPH_NODE_HEIGHT + GAP_WRAP)));
	}

	// Every edge between drawn topics above it and the topic, and each drawn topic under it to the topic
	const edges: GraphEdge[] = [];
	for (const k of level.keys())
		for (const e of byKey.get(k)!.edges) if (level.has(e.to)) edges.push({ from: k, to: e.to, type: e.type });
	for (const { topic, type } of shown) edges.push({ from: topic.key, to: key, type });
	return { nodes, edges, moreBelow: below.length - shown.length };
};
