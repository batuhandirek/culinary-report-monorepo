import _ from 'lodash';

/**
 * Greedy cosine clustering against running centroids (pure): aspect discovery's groups
 * (`AspectDiscoveryService`) and Explore's (`StatementInsightService.groups`). Each item, in the order given, joins the cluster whose centroid it is
 * most similar to when that similarity reaches the threshold, else it starts a cluster of its own.
 * Similarity is cosine; the vectors are normalised here, so a dot product with a centroid's sum
 * over that sum's length is the cosine, and a sum's length is kept up to date in O(d).
 */

/** One claim to cluster: its vector and what the floors count it by */
export interface ClusterItem {
	id: number;
	vector: ArrayLike<number>;
	/** The source it was said in (`r<review id>`, `p<post id>`): a cluster needs several */
	source: string;
	/** The brand it is about; a claim about the city is the city's own (`city`) */
	brand: string;
}

export interface ClusterFloors {
	/** Cosine a claim needs with a cluster's centroid to join it (~0.82) */
	threshold: number;
	minClaims: number;
	minSources: number;
	minBrands: number;
}

export interface ClaimCluster<T extends ClusterItem = ClusterItem> {
	items: T[];
	/** The unit-length centroid */
	centroid: Float32Array;
	sources: number;
	brands: number;
}

/** A unit-length copy (a zero vector stays zero) */
export const normalize = (vector: ArrayLike<number>): Float32Array => {
	const out = Float32Array.from(vector);
	let norm = 0;
	for (let i = 0; i < out.length; i++) norm += out[i] * out[i];
	norm = Math.sqrt(norm);
	if (norm > 0) for (let i = 0; i < out.length; i++) out[i] /= norm;
	return out;
};

const dot = (a: Float32Array, b: Float32Array): number => {
	let sum = 0;
	for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
	return sum;
};

/**
 * The groups of the greedy pass, unfiltered, in the order they were started. Each item joins the
 * most similar centroid at `threshold` or above; ties go to the older cluster.
 */
export const greedyClusters = <T extends { vector: ArrayLike<number> }>(
	items: T[],
	threshold: number,
): { items: T[]; centroid: Float32Array }[] => {
	const groups: { items: T[]; sum: Float32Array; norm: number }[] = [];
	for (const item of items) {
		const v = normalize(item.vector);
		let best = -1;
		let bestCos = threshold;
		let bestDot = 0;
		for (let g = 0; g < groups.length; g++) {
			const group = groups[g];
			const d = dot(v, group.sum);
			const cos = d / group.norm;
			if (cos > bestCos || (best === -1 && cos >= threshold)) {
				best = g;
				bestCos = cos;
				bestDot = d;
			}
		}
		if (best === -1) {
			groups.push({ items: [item], sum: v, norm: 1 });
			continue;
		}
		const group = groups[best];
		group.items.push(item);
		for (let i = 0; i < v.length; i++) group.sum[i] += v[i];
		// |s + v|² = |s|² + 2 s·v + |v|², with |v| = 1
		group.norm = Math.sqrt(group.norm * group.norm + 2 * bestDot + 1);
	}
	return groups.map(group => ({ items: group.items, centroid: normalize(group.sum) }));
};

/**
 * The clusters that pass the floors (`minClaims` claims from `minSources` sources about
 * `minBrands` brands, the city counting as one), largest first (then more sources, then the one
 * started first).
 */
export const clusterClaims = <T extends ClusterItem>(
	items: T[],
	floors: ClusterFloors,
): ClaimCluster<T>[] =>
	greedyClusters(items, floors.threshold)
		.map((group, order) => ({
			items: group.items,
			centroid: group.centroid,
			sources: new Set(group.items.map(i => i.source)).size,
			brands: new Set(group.items.map(i => i.brand)).size,
			order,
		}))
		.filter(
			c =>
				c.items.length >= floors.minClaims &&
				c.sources >= floors.minSources &&
				c.brands >= floors.minBrands,
		)
		.sort(
			(a, b) => b.items.length - a.items.length || b.sources - a.sources || a.order - b.order,
		)
		.map(({ order: _order, ...cluster }) => cluster);

/**
 * Up to `count` claims that say the cluster's thing in different ways, not five paraphrases: the
 * cluster split again at a tighter `threshold`, and from each of its largest sub-clusters the claim
 * closest to that sub-cluster's centroid.
 */
export const diverseSamples = <T extends { vector: ArrayLike<number> }>(
	items: T[],
	count: number,
	threshold: number,
): T[] =>
	greedyClusters(items, threshold)
		.map((group, order) => ({ ...group, order }))
		.sort((a, b) => b.items.length - a.items.length || a.order - b.order)
		.slice(0, count)
		.map(group => _.maxBy(group.items, item => dot(normalize(item.vector), group.centroid))!);
