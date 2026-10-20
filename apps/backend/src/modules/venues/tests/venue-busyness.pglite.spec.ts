import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import { VenueBusyness } from '../entities/venue-busyness.entity.js';
import { VenueBusynessService } from '../services/venue-busyness.service.js';
import { VenueScrapeService } from '../services/venue-scrape.service.js';
import type { GooglePlaceItem } from '../services/venue.service.js';
import { busiestHour, busynessIndex, meanHistogram } from '../util/busyness.js';
import { monthWeeks, weekStart } from '../util/week.js';

import { DETAIL_ITEM, LIST_ITEM } from './fixtures/google-place-items.js';

describe('busyness index', () => {
	it('averages the week’s ten busiest hours', () => {
		// Top ten: Sa 100, Fr 95, Sa 90, Fr 86, Sa 70, Th 70, Fr 67, Th 63, Sa 60, Mo 60
		const index = busynessIndex(DETAIL_ITEM.popularTimesHistogram);
		expect(index).toBe(76.1);
		expect(busiestHour(DETAIL_ITEM.popularTimesHistogram)).toEqual({ day: 'Sa', hour: 20, percent: 100 });
	});

	it('is null without popular times', () => {
		expect(busynessIndex({})).toBeNull();
		expect(busynessIndex(null)).toBeNull();
		expect(busiestHour({ Su: [] })).toBeNull();
	});

	it('averages histograms hour by hour', () => {
		expect(
			meanHistogram([
				{ Fr: [{ hour: 19, occupancyPercent: 60 }] },
				{ Fr: [{ hour: 19, occupancyPercent: 100 }], Sa: [{ hour: 20, occupancyPercent: 50 }] },
				null,
			]),
		).toEqual({ Fr: [{ hour: 19, occupancyPercent: 80 }], Sa: [{ hour: 20, occupancyPercent: 50 }] });
	});

	it('buckets by the Monday of the local week', () => {
		// Sunday 23:30 UTC is already Monday in Berlin
		expect(weekStart(new Date('2026-10-11T23:30:00Z'), 'Europe/Berlin')).toBe('2026-10-12');
		expect(weekStart(new Date('2026-10-11T21:30:00Z'), 'Europe/Berlin')).toBe('2026-10-05');
		expect(monthWeeks('2026-10')).toEqual([
			'2026-09-28',
			'2026-10-05',
			'2026-10-12',
			'2026-10-19',
			'2026-10-26',
		]);
	});
});

describe('VenueBusynessService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueBusynessService;
	const scrapeDetailPages =
		jest.fn<(placeIds: string[], budgetUsd: number, purpose: string) => Promise<{ items: GooglePlaceItem[]; saved: number }>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [VenueBusynessService, { provide: VenueScrapeService, useValue: { scrapeDetailPages } }],
		});
		service = harness.moduleRef.get(VenueBusynessService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('records a sample per returned venue, a null histogram where Google shows none', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const busy = em.create(Venue, { city, placeId: 'place-busy', name: 'Busy' });
		const quiet = em.create(Venue, { city, placeId: 'place-quiet', name: 'Quiet' });
		const missing = em.create(Venue, { city, placeId: 'place-missing', name: 'Missing' });
		await em.flush();
		scrapeDetailPages.mockResolvedValue({
			items: [
				{ ...DETAIL_ITEM, placeId: 'place-busy', title: 'Busy' },
				// A detail page without popular times: `{}` and no live figure
				{ ...LIST_ITEM, placeId: 'place-quiet', title: 'Quiet' },
			],
			saved: 2,
		});
		const now = new Date('2026-10-15T17:00:00Z');

		const res = await service.sample([busy, quiet, missing], 1, now);

		expect(res).toEqual({ requested: 3, sampled: 2, withPopularTimes: 1, withLive: 1 });
		expect(scrapeDetailPages.mock.calls[0][0].sort()).toEqual(['place-busy', 'place-missing', 'place-quiet']);
		em.clear();
		const rows = await em.find(VenueBusyness, {}, { populate: ['venue'], orderBy: { id: 'asc' } });
		expect(rows.map(r => [r.venue.name, r.busynessIndex, r.livePercent, r.liveText])).toEqual([
			['Busy', busynessIndex(DETAIL_ITEM.popularTimesHistogram), 35, 'Usually not too busy'],
			['Quiet', null, null, null],
		]);
		expect(rows[0].histogram?.Sa?.length).toBe(6);
		expect(rows[1].histogram).toBeNull();
		expect((await service.between(busy.id, new Date('2026-10-01'), new Date('2026-11-01'))).length).toBe(1);
		expect((await service.latest(missing.id)).length).toBe(0);
	});
});
