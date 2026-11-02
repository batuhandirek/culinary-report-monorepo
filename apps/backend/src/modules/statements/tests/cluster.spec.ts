import { describe, expect, it } from '@jest/globals';

import {
	clusterClaims,
	type ClusterItem,
	diverseSamples,
	greedyClusters,
	normalize,
} from '../util/cluster.js';

/*
 * The greedy cosine clustering behind "Missing aspects", on fixed vectors: paraphrases group, a
 * different thing stays apart, the floors (claims, sources, brands) and the order.
 */

// Axes: 0 price going up, 1 euros, 2 cash payment, 3 music
const PRICE_UP = [1, 0.25, 0, 0];
const item = (
	id: number,
	vector: number[],
	source: string,
	brand: string,
	text = '',
): ClusterItem & { text: string } => ({
	id,
	vector,
	source,
	brand,
	text,
});
const FLOORS = { threshold: 0.82, minClaims: 3, minSources: 2, minBrands: 2 };

describe('claim clustering', () => {
	it('groups paraphrases and keeps "cash only" apart', () => {
		const items = [
			item(1, [1, 0.2, 0, 0], 'r1', 'a', 'prices went up'),
			item(2, [0.9, 0.35, 0.05, 0], 'r2', 'b', 'it got more expensive'),
			item(3, [0.8, 0.55, 0, 0], 'p1', 'city', 'dürüm is now €9.50'),
			item(4, [0.05, 0, 1, 0], 'r3', 'a', 'cash only'),
		];
		const groups = greedyClusters(items, FLOORS.threshold);
		expect(groups.map(g => g.items.map(i => i.text))).toEqual([
			['prices went up', 'it got more expensive', 'dürüm is now €9.50'],
			['cash only'],
		]);
		// The centroid is unit length and points at the paraphrases
		const c = groups[0].centroid;
		expect(Math.hypot(...c)).toBeCloseTo(1, 5);
		expect(c[0]).toBeGreaterThan(0.8);
	});

	it('joins the most similar centroid, not the first one above the threshold', () => {
		const items = [
			item(1, [1, 0, 0, 0], 'r1', 'a'),
			item(2, [0, 1, 0, 0], 'r2', 'a'),
			// Closer to the second (cos 0.73 against 0.68)
			item(3, [0.6, 0.65, 0, 0], 'r3', 'a'),
		];
		expect(greedyClusters(items, 0.6).map(g => g.items.map(i => i.id))).toEqual([[1], [2, 3]]);
	});

	it('keeps clusters at the floors only, the largest first', () => {
		const price = [1, 2, 3, 4].map(n => item(n, PRICE_UP, `r${n}`, n % 2 ? 'a' : 'b'));
		const cash = [5, 6, 7].map(n => item(n, [0, 0, 1, 0.1], `r${n}`, n % 2 ? 'a' : 'b'));
		// Three claims of one source: too few sources
		const oneSource = [8, 9, 10].map(n => item(n, [0, 0, 0, 1], 'p9', n % 2 ? 'a' : 'b'));
		// Three sources about one brand: too few brands
		const oneBrand = [11, 12, 13].map(n => item(n, [0, 1, 0, 0], `r${n}`, 'a'));
		// Two claims: too few claims
		const small = [14, 15].map(n => item(n, [0, 0.7, 0.7, 0], `r${n}`, n % 2 ? 'a' : 'b'));
		const clusters = clusterClaims(
			[...cash, ...oneSource, ...oneBrand, ...small, ...price],
			FLOORS,
		);
		expect(clusters.map(c => c.items.map(i => i.id))).toEqual([
			[1, 2, 3, 4],
			[5, 6, 7],
		]);
		expect(clusters[0]).toMatchObject({ sources: 4, brands: 2 });
	});

	it('counts the city as a brand of its own', () => {
		const items = [
			item(1, PRICE_UP, 'r1', 'a'),
			item(2, PRICE_UP, 'p1', 'city'),
			item(3, PRICE_UP, 'p2', 'city'),
		];
		expect(clusterClaims(items, FLOORS)).toHaveLength(1);
	});

	it('samples one claim per sub-cluster, the most central of each, largest sub-cluster first', () => {
		const items = [
			item(1, [1, 0.3, 0, 0], 'r1', 'a', 'more expensive now'),
			item(2, [1, 0.32, 0, 0], 'r2', 'a', 'prices are higher now'),
			item(3, [1, 0.31, 0, 0], 'r3', 'a', 'got pricier'),
			item(4, [1, 0, 0.3, 0], 'r4', 'a', 'card fee went up'),
		];
		expect(diverseSamples(items, 5, 0.97).map(i => i.text)).toEqual([
			'got pricier',
			'card fee went up',
		]);
		expect(diverseSamples(items, 1, 0.97).map(i => i.text)).toEqual(['got pricier']);
	});

	it('normalises without touching a zero vector', () => {
		expect([...normalize([3, 4])]).toEqual([0.6000000238418579, 0.800000011920929]);
		expect([...normalize([0, 0])]).toEqual([0, 0]);
	});
});
