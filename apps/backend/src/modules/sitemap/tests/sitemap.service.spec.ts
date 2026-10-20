import { describe, expect, it } from '@jest/globals';

import { SitemapService } from '../services/sitemap.service.js';

describe('SitemapService', () => {
	const entries = [
		{ path: '/a', updatedAt: '2026-01-01T00:00:00.000Z' },
		{ path: '/b', updatedAt: '2026-01-02T00:00:00.000Z' },
		{ path: '/c', updatedAt: '2026-01-03T00:00:00.000Z' },
	];
	const service = new SitemapService();
	service.register({
		name: 'pages',
		count: async () => entries.length,
		list: async (offset, limit) => entries.slice(offset, offset + limit),
	});

	it('lists every registered section with its size', async () => {
		expect(await service.getSections()).toEqual({ items: [{ name: 'pages', totalItems: 3 }] });
	});

	it('pages through a section', async () => {
		expect(await service.getEntries('pages', 2, 2)).toEqual({
			items: [entries[2]],
			totalItems: 3,
		});
	});

	it('refuses a name that cannot be a file name part', () => {
		expect(() =>
			service.register({ name: 'blog-tags', count: async () => 0, list: async () => [] }),
		).toThrow();
	});
});
