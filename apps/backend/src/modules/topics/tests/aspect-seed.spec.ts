import { describe, expect, it } from '@jest/globals';

import { ASPECT_ROOTS, ASPECT_SEED } from '../constants/aspect-seed.constant.js';
import { TOPIC_SEED } from '../constants/topic-seed.constant.js';
import { TopicKindEnum } from '../entities/topic.entity.js';
import { aspectKey } from '../util/topics.js';

import { seedIndex } from './factories/topic.factory.js';

const index = seedIndex();
const roots: readonly string[] = ASPECT_ROOTS;

/* The aspects: the seeded vocabulary, and how the index tells them apart from the kinds of food. */
describe('ASPECT_SEED', () => {
	it('has unique snake_case keys, none a food topic has and none a catch-all', () => {
		const keys = ASPECT_SEED.map(s => s.key);
		expect(new Set(keys).size).toBe(keys.length);
		const food = new Set(TOPIC_SEED.map(s => s.key));
		for (const key of keys) {
			expect([key, food.has(key)]).toEqual([key, false]);
			// Stable: the key an admin's label would make again
			expect(aspectKey(key)).toBe(key);
			expect(key.endsWith('_other')).toBe(false);
		}
	});

	it('is nine hinted roots without a parent and leaves under one of them, all aspects', () => {
		const seededRoots = ASPECT_SEED.filter(s => !s.parent).map(s => s.key);
		expect(seededRoots).toEqual([...ASPECT_ROOTS]);
		for (const s of ASPECT_SEED) {
			expect([s.key, s.kind]).toEqual([s.key, TopicKindEnum.ASPECT]);
			expect([s.key, s.hint?.trim() || null]).toEqual([s.key, expect.any(String)]);
			if (s.parent) expect([s.key, roots.includes(s.parent)]).toEqual([s.key, true]);
			expect([s.key, s.aliases ?? [], s.mid ?? null]).toEqual([s.key, [], null]);
		}
		expect(ASPECT_SEED.filter(s => s.parent).length).toBeGreaterThan(40);
	});
});

describe('TopicIndex aspects', () => {
	it('walks the tree: descendants, root, promptLabel', () => {
		const wait = index.descendants('wait');
		expect(wait[0]).toBe('wait');
		expect([...wait].sort()).toEqual(['queue', 'wait', 'wait_for_food', 'wait_for_table']);
		expect(index.descendants('nope')).toEqual([]);
		expect(index.rootOf('price_increase')).toBe('price');
		expect(index.rootOf('price')).toBe('price');
		expect(index.rootOf('nope')).toBeUndefined();
		expect([index.isRoot('other'), index.isRoot('taste'), index.isRoot('nope')]).toEqual([
			true,
			false,
			false,
		]);
		expect([index.isAspect('taste'), index.isAspect('pizza'), index.isAspect('nope')]).toEqual([
			true,
			false,
			false,
		]);
		expect(index.promptLabel('price_increase')).toBe('price / price increase');
		expect(index.promptLabel('price')).toBe('price');
		expect(index.label('wait_for_food')).toBe('Wait for food');
		expect(index.label('nope')).toBe('nope');
	});

	it("resolves an agent's key to the aspect to link: never a kind of food or an unknown key", () => {
		expect(index.aspect('taste')).toEqual({ id: undefined, key: 'taste', root: 'food' });
		expect(index.aspect('price')).toEqual({ id: undefined, key: 'price', root: 'price' });
		expect(index.aspect('pizza')).toBeUndefined();
		expect(index.aspect('nope')).toBeUndefined();
		expect(index.aspect(null)).toBeUndefined();
		expect(index.aspect(undefined)).toBeUndefined();
	});

	it('lists the roots in order, each followed by its children by label', () => {
		const aspects = index.aspects;
		expect(aspects.map(t => t.kind)).toEqual(aspects.map(() => TopicKindEnum.ASPECT));
		expect(aspects.filter(t => !t.parentKey).map(t => t.key)).toEqual([...ASPECT_ROOTS]);
		expect(aspects[0].key).toBe('food');
		const at = (key: string) => aspects.findIndex(t => t.key === key);
		for (const child of ASPECT_SEED.filter(s => s.parent === 'food'))
			expect(at(child.key)).toBeLessThan(at('drinks'));
		// Between a root and the next, only its own children, sorted by label
		for (let i = 0; i < ASPECT_ROOTS.length; i++) {
			const from = at(ASPECT_ROOTS[i]);
			const to = i + 1 < ASPECT_ROOTS.length ? at(ASPECT_ROOTS[i + 1]) : aspects.length;
			const children = aspects.slice(from + 1, to);
			expect(children.map(t => t.parentKey)).toEqual(children.map(() => ASPECT_ROOTS[i]));
			expect(children.map(t => t.label)).toEqual(
				[...children.map(t => t.label)].sort((a, b) => a.localeCompare(b)),
			);
		}
		expect(aspects.length).toBe(ASPECT_SEED.length);
		expect(index.food.some(t => t.kind === TopicKindEnum.ASPECT)).toBe(false);
		expect(index.food.length + aspects.length).toBe(index.topics.length);
	});

	it('writes the legend by root, each key with its hint', () => {
		const legend = index.aspectLegend();
		expect(legend.startsWith('food: food (about the food, when nothing finer fits), ')).toBe(true);
		expect(legend).toContain('wait_for_food (the time between ordering and the food arriving)');
		expect(legend).toContain('; drinks: drinks (about the drinks, when nothing finer fits), ');
		// Each root heads its own part, in order (a hint may hold "; " itself, so no split)
		const heads = ASPECT_ROOTS.map(root => legend.indexOf(`${root}: ${root} (`));
		expect(heads[0]).toBe(0);
		expect(heads.every(i => i >= 0)).toBe(true);
		expect(heads).toEqual([...heads].sort((a, b) => a - b));
		for (const root of ASPECT_ROOTS.slice(1)) expect(legend).toContain(`; ${root}: ${root} (`);
		expect(legend.endsWith(')')).toBe(true);
	});

	it('keeps aspects out of the cuisine lookup', () => {
		expect(index.resolve('Vegan Food')).toEqual(['vegan']);
		expect(index.resolve('Service')).toEqual([]);
		expect(index.exact('service')).toBeUndefined();
		expect(index.exact('wait_for_food')).toBeUndefined();
		expect(index.dishTopic('taste')).toBeUndefined();
		expect(index.resolveMenuItem({ name: 'Noise', category: 'Drinks' })).toEqual([]);
		// The root "food" is an aspect, no kind of food
		expect(index.get('food')?.kind).toBe(TopicKindEnum.ASPECT);
		expect(index.food.some(t => t.key === 'food')).toBe(false);
	});
});

describe('aspectKey', () => {
	it.each([
		['Tip prompts', 'tip_prompts'],
		['price_level', 'price_level'],
		[' Wait-for-food! ', 'wait_for_food'],
		['Café crème', 'cafe_creme'],
		['Order  accuracy (wrong items)', 'order_accuracy_wrong_items'],
		['Döner', 'doner'],
		['', null],
		['   ', null],
		['!!!', null],
		[null, null],
		[undefined, null],
	])('%j → %j', (raw, key) => {
		expect(aspectKey(raw)).toBe(key);
	});
});
