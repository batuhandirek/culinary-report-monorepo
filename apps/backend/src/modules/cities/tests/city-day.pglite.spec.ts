import { BadRequestException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminCityDaysController } from '../controllers/admin.city-days.controller.js';
import { CityDay } from '../entities/city-day.entity.js';
import { CityEventKindEnum } from '../entities/city-event.entity.js';
import { CityService } from '../services/city.service.js';
import {
	CityContextSourcesService,
	DailyWeather,
	PublicHoliday,
} from '../services/city-context-sources.service.js';
import { CityDayService } from '../services/city-day.service.js';
import { monthContext } from '../util/month-context.js';

import { cityFactory } from './factories/city.factory.js';

// September 2026: Saturdays on the 5th, 12th, 19th and 26th
const SEPTEMBER_RAIN: Record<string, number> = {
	'2026-09-06': 4.2, // Sunday of the first weekend
	'2026-09-12': 1.0, // Saturday, exactly the threshold
	'2026-09-15': 12, // a Tuesday
	'2026-09-26': 0.4, // drizzle: not a rain day
	'2026-09-27': 0.2,
};

const septemberWeather = (from: string, to: string): DailyWeather[] => {
	const out: DailyWeather[] = [];
	for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
		const date = d.toISOString().slice(0, 10);
		out.push({ date, tMax: 20, rainMm: SEPTEMBER_RAIN[date] ?? 0 });
	}
	return out;
};

const HOLIDAYS: PublicHoliday[] = [
	{ date: '2026-09-20', name: "World Children's Day", global: false, counties: ['DE-TH'] },
	{ date: '2026-10-03', name: 'German Unity Day', global: true, counties: null },
	{ date: '2026-03-08', name: "International Women's Day", global: false, counties: ['DE-BE', 'DE-MV'] },
];

/* A city's days: weather from Open-Meteo and public holidays from Nager.Date, both mocked;
 * one row per day however often it is fetched; the month context reports read. */
describe('City days (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: CityDayService;
	let controller: AdminCityDaysController;
	const sources = {
		weather: jest.fn(async (_place: unknown, from: string, to: string) => septemberWeather(from, to)),
		publicHolidays: jest.fn(async () => HOLIDAYS),
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				CityService,
				CityDayService,
				AdminCityDaysController,
				{ provide: CityContextSourcesService, useValue: sources },
			],
		});
		service = harness.moduleRef.get(CityDayService);
		controller = harness.moduleRef.get(AdminCityDaysController);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('stores a day once, updating it on a second fetch', async () => {
		const city = await cityFactory.create({ region: 'DE-BE', lat: 52.52, lng: 13.405 });

		expect(await controller.fillCityDays(city.id, { from: '2026-09-01', to: '2026-10-03' })).toEqual({
			written: 33,
		});
		expect(sources.weather).toHaveBeenLastCalledWith(
			{ lat: 52.52, lng: 13.405, timezone: 'Europe/Berlin' },
			'2026-09-01',
			'2026-10-03',
		);

		// The archive revised a day, and its newest day is still empty: the old figure stays
		sources.weather.mockResolvedValueOnce([
			{ date: '2026-09-15', tMax: 18, rainMm: 9 },
			{ date: '2026-09-16', tMax: null, rainMm: null },
		]);
		await service.fill(city.id, '2026-09-15', '2026-09-16');

		harness.orm.em.clear();
		const rows = await harness.orm.em.find(CityDay, { city: city.id });
		expect(rows).toHaveLength(33);
		const byDate = new Map(rows.map(r => [r.date, r]));
		expect(byDate.get('2026-09-15')).toMatchObject({ tMax: 18, rainMm: 9 });
		expect(byDate.get('2026-09-16')).toMatchObject({ tMax: 20, rainMm: 0 });

		// Nationwide holidays and the region's; another region's are left out
		expect(rows.filter(r => r.holiday).map(r => [r.date, r.holiday])).toEqual([
			['2026-10-03', 'German Unity Day'],
		]);
		expect(byDate.get('2026-09-20')?.holiday ?? null).toBeNull();
	});

	it("counts the month's rainy weekends, rain days, holidays and events", async () => {
		const city = await cityFactory.create({ region: 'DE-BE', lat: 52.52, lng: 13.405 });
		await service.fill(city.id, '2026-09-01', '2026-10-01');
		await controller.addCityEvent(city.id, {
			kind: CityEventKindEnum.EVENT,
			name: 'Berlin Marathon',
			startDate: '2026-09-26',
			endDate: '2026-09-27',
		});
		await controller.addCityEvent(city.id, {
			kind: CityEventKindEnum.SCHOOL_HOLIDAY,
			name: 'Autumn school holidays',
			startDate: '2026-10-19',
			endDate: '2026-10-31',
		});
		await expect(
			controller.addCityEvent(city.id, {
				kind: CityEventKindEnum.EVENT,
				name: 'Backwards',
				startDate: '2026-09-10',
				endDate: '2026-09-09',
			}),
		).rejects.toBeInstanceOf(BadRequestException);

		const context = await controller.getCityMonthContext(city.id, { month: '2026-09' });
		expect(context).toEqual({
			month: '2026-09',
			weekends: 4,
			// The 6th (Sunday) and the 12th (Saturday, 1.0 mm); the 26th–27th only drizzled
			rainyWeekends: 2,
			rainDays: 3,
			avgTMax: 20,
			holidays: [],
			events: [
				{
					name: 'Berlin Marathon',
					kind: CityEventKindEnum.EVENT,
					startDate: '2026-09-26',
					endDate: '2026-09-27',
				},
			],
		});

		// No weather for October yet beyond the 1st: no weather figures, never a dry month
		const october = await service.month(city.id, '2026-10');
		expect(october.rainyWeekends).toBeUndefined();
		expect(october.holidays).toEqual([]);
		expect(october.events.map(e => e.name)).toEqual(['Autumn school holidays']);

		// The portal's window: the same figures per month in one go
		expect(await service.months(city.id, ['2026-08', '2026-09', '2026-10'])).toEqual([
			{ month: '2026-08', weekends: 5, holidays: [], events: [] },
			context,
			october,
		]);
	});

	it('the daily fill fetches the last week up to local yesterday for active cities', async () => {
		const city = await cityFactory.create({ lat: 1, lng: 2, active: true });
		sources.weather.mockClear();
		await service.fillRecent(new Date('2026-10-17T03:00:00Z'));
		const call = sources.weather.mock.calls.find(
			([place]) => (place as { lat: number }).lat === city.lat,
		);
		expect(call?.slice(1)).toEqual(['2026-10-10', '2026-10-16']);
	});
});

describe('monthContext', () => {
	it('closes a weekend in the next month and leaves weather out with gaps', () => {
		const days = [
			{ date: '2026-10-31', rainMm: 0, tMax: 10 },
			{ date: '2026-11-01', rainMm: 3, tMax: 9 },
		];
		const context = monthContext('2026-10', days, []);
		expect(context.weekends).toBe(5);
		// 1 of 31 days has weather
		expect(context.rainyWeekends).toBeUndefined();
	});
});
