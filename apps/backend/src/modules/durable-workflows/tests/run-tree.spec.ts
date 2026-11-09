import { describe, expect, it } from '@jest/globals';

import type { RunTreeRow } from '../services/durable-run-tree.service.js';
import { buildRunTree } from '../util/run-tree.js';

const run = (id: string, name: string, parentId?: string, status = 'SUCCESS'): RunTreeRow => ({
	id,
	name,
	className: 'C',
	status,
	createdAt: 0,
	attributes: {},
	...(parentId && { parentId }),
});

describe('buildRunTree', () => {
	it('hangs each run under the run that started it, the root first', () => {
		const nodes = buildRunTree('root', [
			run('root', 'city'),
			run('a', 'post', 'root'),
			run('a1', 'llm', 'a'),
			run('b', 'other', 'root'),
		]);
		expect(nodes.map(n => (n.kind === 'run' ? [n.row.id, n.parentKey] : n.key))).toEqual([
			['root', undefined],
			['a', 'root'],
			['a1', 'a'],
			['b', 'root'],
		]);
	});

	it("folds a parent's many runs of one workflow into one node with their statuses, leaving out what is under them", () => {
		const posts = Array.from({ length: 5 }, (_, i) =>
			run(`p${i}`, 'post', 'root', i < 3 ? 'SUCCESS' : 'PENDING'),
		);
		const nodes = buildRunTree(
			'root',
			[run('root', 'city'), ...posts, run('p0-llm', 'llm', 'p0'), run('x', 'other', 'root')],
			4,
		);
		expect(nodes).toEqual([
			{ kind: 'run', row: run('root', 'city') },
			{
				kind: 'group',
				key: 'root/C.post',
				parentKey: 'root',
				parentId: 'root',
				name: 'post',
				className: 'C',
				count: 5,
				statuses: [
					{ status: 'SUCCESS', count: 3 },
					{ status: 'PENDING', count: 2 },
				],
			},
			{ kind: 'run', row: run('x', 'other', 'root'), parentKey: 'root' },
		]);
	});

	it('starts from a run in the middle of a tree, its parent left out', () => {
		const nodes = buildRunTree('a', [run('a', 'post', 'root'), run('a1', 'llm', 'a')]);
		expect(nodes.map(n => (n.kind === 'run' ? n.row.id : n.key))).toEqual(['a', 'a1']);
		expect(nodes[0]).toEqual({ kind: 'run', row: run('a', 'post', 'root') });
	});
});
