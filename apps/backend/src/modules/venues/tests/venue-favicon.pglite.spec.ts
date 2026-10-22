import ImageKit from '@imagekit/nodejs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Image } from 'src/modules/image/entities/image.entity.js';
import { ImageService } from 'src/modules/image/services/image.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { isPublicWebUrl } from 'src/shared/util/public-fetch.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import { FaviconFetchService, FetchedResource } from '../services/favicon-fetch.service.js';
import { VenueService } from '../services/venue.service.js';
import { VenueFaviconService } from '../services/venue-favicon.service.js';
import { faviconFormat, faviconLinks, faviconSite } from '../util/favicon.js';

import { LIST_ITEM } from './fixtures/google-place-items.js';

const PNG = (seed: number) =>
	Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		Buffer.from([seed, 1, 2, 3]),
	]);
const ICO = Buffer.from([0, 0, 1, 0, 1, 0, 16, 16]);
const SVG = Buffer.from(
	'<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>',
);
const HTML = (head: string) =>
	Buffer.from(`<!doctype html><html><head>${head}</head><body></body></html>`);

describe('favicon helpers', () => {
	it('takes icons only from a public website of the venue’s own', () => {
		expect(faviconSite('https://pinoli.de/speisekarte')?.href).toBe(
			'https://pinoli.de/speisekarte',
		);
		expect(faviconSite('www.pinoli.de')?.href).toBe('https://www.pinoli.de/');
		for (const site of [
			null,
			'',
			'https://www.instagram.com/pinoli',
			'https://linktr.ee/pinoli',
			'https://www.lieferando.de/pinoli',
			'https://pinoli.business.site',
			'ftp://pinoli.de',
			'http://127.0.0.1/',
			'http://localhost:3000',
			'http://router.local/',
			'http://[::1]/',
			'https://pinoli.de:8443/',
		]) {
			expect(faviconSite(site)).toBeNull();
		}
		expect(isPublicWebUrl(new URL('http://169.254.169.254/latest'))).toBe(false);
	});

	it('ranks a page’s icon links, largest first, ICO last among equals', () => {
		const html = `
			<link rel="stylesheet" href="/site.css">
			<link rel="icon" href="/favicon.ico">
			<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
			<link rel="icon" sizes="192x192" href="icon-192.png">
			<link rel="apple-touch-icon" href="https://cdn.pinoli.de/apple.png">
			<link rel="icon" type="image/svg+xml" href="/icon.svg">
			<link rel="icon" href="data:image/png;base64,AAAA">
			<link rel="icon" sizes="32x32" href="/icon-32.png">
			</head><link rel="icon" sizes="512x512" href="/body.png">`;
		expect(faviconLinks(html, 'https://www.pinoli.de/de/')).toEqual([
			'https://www.pinoli.de/de/icon-192.png',
			'https://cdn.pinoli.de/apple.png',
			'https://www.pinoli.de/icon.svg',
			'https://www.pinoli.de/icon-32.png',
			'https://www.pinoli.de/favicon.ico',
		]);
		expect(
			faviconLinks(
				`<base href="https://static.pinoli.de/"><LINK REL='Shortcut Icon' HREF=f.ico>`,
				'https://pinoli.de/',
			),
		).toEqual(['https://static.pinoli.de/f.ico']);
	});

	it('knows an image by its bytes, not its name', () => {
		expect(faviconFormat(PNG(1))).toBe('png');
		expect(faviconFormat(ICO)).toBe('ico');
		expect(faviconFormat(SVG)).toBe('svg');
		expect(faviconFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
		expect(faviconFormat(HTML(''))).toBeNull();
		expect(faviconFormat(Buffer.from([]))).toBeNull();
	});
});

/* The website icons, with the sites (`FaviconFetchService`) and ImageKit mocked; `ImageService`
 * and the rows are real. */
describe('VenueFaviconService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueFaviconService;
	let sites: Record<string, Buffer | Error>;
	let uploadCount = 0;
	const fetcher = {
		get: jest.fn(async (url: string, _options?: unknown): Promise<FetchedResource | null> => {
			const body = sites[url];
			if (body instanceof Error) throw body;
			return body ? { url, contentType: null, body } : null;
		}),
	};
	const imagekit = {
		files: {
			upload: jest.fn(async ({ fileName }: { fileName: string }) => {
				uploadCount++;
				// ImageKit reads no dimensions from some ICO files
				const readable = !fileName.endsWith('.ico');
				return {
					fileId: `file-${uploadCount}`,
					width: readable ? 64 : undefined,
					height: readable ? 64 : undefined,
					filePath: `/test-venue-favicons/${fileName}`,
					name: fileName,
					fileType: 'image',
					size: 10,
					url: `https://ik.example/${uploadCount}/${fileName}`,
				};
			}),
			delete: jest.fn(async (_fileId: string) => undefined),
		},
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VenueFaviconService,
				VenueService,
				ImageService,
				{ provide: FaviconFetchService, useValue: fetcher },
				{ provide: ImageKit, useValue: imagekit },
			],
		});
		service = harness.moduleRef.get(VenueFaviconService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		sites = {};
		jest.clearAllMocks();
		await harness.orm.em.nativeUpdate(Venue, {}, { closed: true });
		harness.orm.em.clear();
	});

	const venue = async (params: Partial<Venue>): Promise<Venue> => {
		const em = harness.orm.em.fork();
		const row = em.create(Venue, {
			placeId: `place-${Math.random().toString(36).slice(2)}`,
			name: 'Pinoli',
			city: testCity(em),
			...params,
		});
		await em.flush();
		return row;
	};

	const reload = (id: string) =>
		harness.orm.em.fork().findOneOrFail(Venue, { id }, { populate: ['favicon'] });

	it('stores the page’s best icon once, and only uploads it again when it changes', async () => {
		const { id } = await venue({ website: 'https://pinoli.de' });
		sites['https://pinoli.de/'] = HTML(
			'<link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple.png">',
		);
		sites['https://pinoli.de/apple.png'] = PNG(1);

		expect(await service.refreshDue(new Date('2026-10-01T00:00:00Z'))).toEqual({
			venues: 1,
			sites: 1,
			outcomes: { updated: 1, unchanged: 0, missing: 0, generic: 0, no_site: 0 },
		});
		const first = await reload(id);
		expect(first.favicon?.url).toMatch(/\.png$/);
		expect(first.faviconCheckedAt).toEqual(new Date('2026-10-01T00:00:00Z'));
		expect(fetcher.get).not.toHaveBeenCalledWith(
			'https://pinoli.de/favicon.ico',
			expect.anything(),
		);

		// Not due within the refresh period
		expect((await service.refreshDue(new Date('2026-10-20T00:00:00Z'))).venues).toBe(0);

		// Same bytes a month later: no upload
		expect(
			(await service.refreshDue(new Date('2026-11-02T00:00:00Z'))).outcomes.unchanged,
		).toBe(1);
		expect(imagekit.files.upload).toHaveBeenCalledTimes(1);
		expect((await reload(id)).favicon?.id).toBe(first.favicon?.id);

		// A redesigned icon replaces the old one, whose row and file go
		sites['https://pinoli.de/apple.png'] = PNG(2);
		expect((await service.refreshDue(new Date('2026-12-03T00:00:00Z'))).outcomes.updated).toBe(
			1,
		);
		const second = await reload(id);
		expect(second.favicon?.id).not.toBe(first.favicon?.id);
		expect(await harness.orm.em.fork().count(Image, { id: first.favicon!.id })).toBe(0);
		expect(imagekit.files.delete).toHaveBeenCalledWith(first.favicon!.remoteId);
	});

	it('fetches a website once for every open venue on it, each with its own row on one file', async () => {
		const at = new Date('2026-10-01T00:00:00Z');
		// The group fetches whichever venue's spelling comes first
		for (const page of [
			'https://lap.coffee/',
			'https://www.lap.coffee/',
			'http://www.lap.coffee/',
		])
			sites[page] = HTML('<link rel="icon" href="https://lap.coffee/i.png">');
		sites['https://lap.coffee/i.png'] = PNG(8);
		// Spelled three ways, one of them checked last week and not due
		const branches = [
			await venue({ website: 'https://www.lap.coffee/' }),
			await venue({ website: 'http://www.lap.coffee/' }),
			await venue({ website: 'lap.coffee' }),
			await venue({
				website: 'https://lap.coffee/',
				faviconCheckedAt: new Date('2026-09-25T00:00:00Z'),
			}),
		];
		await venue({ website: 'https://lap.coffee/', closed: true });
		await venue({ website: 'https://not-lap.coffee.example.de/' });

		const result = await service.refreshDue(at);
		expect(result.sites).toBe(2);
		expect(result.venues).toBe(5);
		expect(result.outcomes.updated).toBe(4);
		expect(
			fetcher.get.mock.calls.filter(([url]) => url === 'https://lap.coffee/i.png'),
		).toHaveLength(1);
		expect(imagekit.files.upload).toHaveBeenCalledTimes(1);
		const stored = await Promise.all(branches.map(b => reload(b.id)));
		expect(new Set(stored.map(v => v.favicon!.id)).size).toBe(4);
		expect(new Set(stored.map(v => v.favicon!.remoteId)).size).toBe(1);
		for (const v of stored) expect(v.faviconCheckedAt).toEqual(at);

		// A new branch takes the icon already stored, without a fetch's upload
		const late = await venue({ website: 'https://www.lap.coffee/' });
		expect((await service.refreshDue(at)).outcomes).toMatchObject({ updated: 1, unchanged: 4 });
		expect(imagekit.files.upload).toHaveBeenCalledTimes(1);
		expect((await reload(late.id)).favicon!.remoteId).toBe(stored[0].favicon!.remoteId);

		// A new icon replaces the shared file once all its rows go
		sites['https://lap.coffee/i.png'] = PNG(9);
		expect((await service.refreshDue(new Date('2026-11-02T00:00:00Z'))).outcomes.updated).toBe(
			5,
		);
		expect(imagekit.files.upload).toHaveBeenCalledTimes(2);
		expect(imagekit.files.delete).toHaveBeenCalledWith(stored[0].favicon!.remoteId);
		expect(
			await harness.orm.em.fork().count(Image, { remoteId: stored[0].favicon!.remoteId }),
		).toBe(0);
	});

	it('takes nothing once its time is up, and leaves the rest due', async () => {
		const { id } = await venue({ website: 'https://later.de' });
		expect(await service.refreshDue(new Date('2026-10-01T00:00:00Z'), 0)).toMatchObject({
			venues: 0,
			sites: 0,
		});
		expect(fetcher.get).not.toHaveBeenCalled();
		expect((await reload(id)).faviconCheckedAt).toBeNull();
	});

	it('falls back to /favicon.ico, then Google’s copy, past what ImageKit can’t read', async () => {
		const { id } = await venue({ website: 'http://trattoria.de/' });
		// The site redirected to www and links no icon
		sites['http://trattoria.de/'] = HTML('<title>Trattoria</title>');
		fetcher.get.mockImplementationOnce(async url => ({
			url: 'https://www.trattoria.de/',
			contentType: null,
			body: sites[url] as Buffer,
		}));
		sites['https://www.trattoria.de/favicon.ico'] = ICO;
		sites['https://www.google.com/s2/favicons?domain=trattoria.de&sz=128'] = PNG(3);

		expect((await service.refreshDue(new Date('2026-10-01T00:00:00Z'))).outcomes.updated).toBe(
			1,
		);
		expect((await reload(id)).favicon?.fileName).toMatch(/\.png$/);
		// The unreadable ICO was deleted again
		expect(imagekit.files.upload).toHaveBeenCalledTimes(2);
		expect(imagekit.files.delete).toHaveBeenCalledWith('file-' + (uploadCount - 1));
	});

	it('leaves venues due when ImageKit itself fails, and stops the run', async () => {
		const first = await venue({ website: 'https://keys.de' });
		const second = await venue({ website: 'https://keys-two.de' });
		for (const site of ['https://keys.de', 'https://keys-two.de']) {
			sites[`${site}/`] = HTML('<link rel="icon" href="/i.png">');
			sites[`${site}/i.png`] = PNG(7);
		}
		imagekit.files.upload.mockRejectedValueOnce(
			new Error('401 Your account cannot be authenticated'),
		);
		imagekit.files.upload.mockRejectedValueOnce(
			new Error('401 Your account cannot be authenticated'),
		);

		await expect(service.refreshDue(new Date('2026-10-01T00:00:00Z'))).rejects.toThrow(
			'Favicon run stopped: 401',
		);
		for (const { id } of [first, second])
			expect((await reload(id)).faviconCheckedAt).toBeNull();
		expect((await service.refreshDue(new Date('2026-10-01T01:00:00Z'))).outcomes.updated).toBe(
			2,
		);
	});

	it('keeps a stored icon when the site is down, and retries a venue without one after a week', async () => {
		const withIcon = await venue({ website: 'https://down.de' });
		const without = await venue({ website: 'https://never.de' });
		sites['https://down.de/'] = HTML('<link rel="icon" href="/i.png">');
		sites['https://down.de/i.png'] = PNG(4);
		await service.refreshDue(new Date('2026-08-01T00:00:00Z'));
		const stored = (await reload(withIcon.id)).favicon!.id;

		sites = {
			'https://down.de/': new Error('ETIMEDOUT'),
			'https://never.de/': new Error('ECONNREFUSED'),
		};
		// Six days on, neither is due; nine days on, only the one without an icon
		expect((await service.refreshDue(new Date('2026-08-07T00:00:00Z'))).venues).toBe(0);
		expect(await service.refreshDue(new Date('2026-08-10T00:00:00Z'))).toEqual({
			venues: 1,
			sites: 1,
			outcomes: { updated: 0, unchanged: 0, missing: 1, generic: 0, no_site: 0 },
		});
		expect((await reload(without.id)).faviconCheckedAt).toEqual(
			new Date('2026-08-10T00:00:00Z'),
		);

		// A month on, both: the stored icon outlives the failed fetch
		expect((await service.refreshDue(new Date('2026-09-02T00:00:00Z'))).outcomes.missing).toBe(
			2,
		);
		expect((await reload(withIcon.id)).favicon?.id).toBe(stored);
	});

	it('drops an icon three hosts share as a platform default, but not a chain’s', async () => {
		const wordpress = PNG(6);
		const own = async (website: string) => {
			const row = await venue({ website });
			sites[`${website}/`] = HTML('<link rel="icon" href="/wp.png">');
			sites[`${website}/wp.png`] = wordpress;
			return row;
		};
		const at = new Date('2026-10-01T00:00:00Z');
		// A chain's branches on one host count once
		const a = await own('https://bar-one.de');
		await service.refreshDue(at);
		await own('https://bar-one.de');
		const b = await own('https://cafe-two.de');
		expect((await service.refreshDue(at)).outcomes.updated).toBe(2);
		const kept = await reload(b.id);
		expect(kept.favicon).not.toBeNull();

		// The third host makes it generic, for every venue holding it
		const c = await own('https://imbiss-three.de');
		expect((await service.refreshDue(at)).outcomes.generic).toBe(1);
		for (const id of [a.id, b.id, c.id]) expect((await reload(id)).favicon).toBeNull();
		expect(imagekit.files.delete).toHaveBeenCalledWith(kept.favicon!.remoteId);
		// The hash stays, so the next venue with it is caught at once and none waits a mere week
		expect((await reload(c.id)).faviconHash).toBe((await reload(a.id)).faviconHash);
		const d = await own('https://doner-four.de');
		expect((await service.refreshDue(at)).outcomes.generic).toBe(1);
		expect((await reload(d.id)).favicon).toBeNull();
		expect(
			(await service.due(new Date('2026-10-09T00:00:00Z'), 10)).map(v => v.id),
		).not.toContain(c.id);
	});

	it('drops the icon of a venue whose website is gone or is a platform profile', async () => {
		const { id } = await venue({ website: 'https://gone.de' });
		sites['https://gone.de/'] = HTML('<link rel="icon" href="/i.png">');
		sites['https://gone.de/i.png'] = PNG(5);
		await service.refreshDue(new Date('2026-10-01T00:00:00Z'));
		const image = (await reload(id)).favicon!;

		const em = harness.orm.em.fork();
		await em.nativeUpdate(
			Venue,
			{ id },
			{ website: 'https://www.instagram.com/gone', faviconCheckedAt: null },
		);
		expect((await service.refreshDue(new Date('2026-10-02T00:00:00Z'))).outcomes.no_site).toBe(
			1,
		);
		const after = await reload(id);
		expect(after.favicon).toBeNull();
		expect(after.faviconHash).toBeNull();
		expect(imagekit.files.delete).toHaveBeenCalledWith(image.remoteId);
	});

	it('skips closed venues and venues without a website, never-checked ones first', async () => {
		await venue({ website: 'https://closed.de', closed: true });
		await venue({ website: null });
		const old = await venue({
			website: 'https://old.de',
			faviconCheckedAt: new Date('2026-01-01T00:00:00Z'),
		});
		const fresh = await venue({ website: 'https://new.de' });

		const due = await service.due(new Date('2026-10-01T00:00:00Z'), 10);
		expect(due.map(v => v.id)).toEqual([fresh.id, old.id]);
		expect((await service.due(new Date('2026-10-01T00:00:00Z'), 1)).map(v => v.id)).toEqual([
			fresh.id,
		]);
	});

	it('looks again when a scrape brings a new website', async () => {
		const known = await venue({
			placeId: LIST_ITEM.placeId,
			website: 'https://old-site.de',
			faviconCheckedAt: new Date('2026-10-01T00:00:00Z'),
		});
		const venueService = harness.moduleRef.get(VenueService);
		const saved = await venueService.saveGooglePlace({
			...LIST_ITEM,
			website: 'https://old-site.de',
		});
		expect(saved?.faviconCheckedAt).toEqual(new Date('2026-10-01T00:00:00Z'));
		const changed = await venueService.saveGooglePlace({
			...LIST_ITEM,
			website: 'https://new-site.de',
		});
		expect(changed?.id).toBe(known.id);
		expect(changed?.faviconCheckedAt).toBeNull();
	});
});
