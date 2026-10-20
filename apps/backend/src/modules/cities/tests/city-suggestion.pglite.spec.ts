import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { CitySourceSuggestionAgent } from '../agents/city-source-suggestion.agent.js';
import { AdminCitiesController } from '../controllers/admin.cities.controller.js';
import { CitySourceKindEnum } from '../entities/city-source.entity.js';
import { CityService } from '../services/city.service.js';
import { CitySuggestionService } from '../services/city-suggestion.service.js';
import { suggestDistricts } from '../util/suggest-districts.js';

import { cityFactory, testCitySource } from './factories/city.factory.js';

const s = (value: string) => ({ value, reason: 'Locals tag their lunch with it' });

/* A new city's first sources come from one LLM call as disabled suggestions; its districts and
 * postal codes from where Google put its venues. The agent is mocked. */
describe('City suggestions (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminCitiesController;
	let cities: CityService;
	const agent = mockAgent({
		tiktokHashtags: [s('#MunichFood'), s('muenchenfood'), s('munich food'), s('munichfood')],
		tiktokSearches: [s('München Restaurant'), s('münchen restaurant'), s('best ramen munich')],
		instagramHashtags: [s('munichcafe')],
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				CityService,
				CitySuggestionService,
				AdminCitiesController,
				{ provide: CitySourceSuggestionAgent, useValue: agent },
			],
		});
		controller = harness.moduleRef.get(AdminCitiesController);
		cities = harness.moduleRef.get(CityService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('stores suggestions as disabled rows, skipping what the city has and repeats', async () => {
		const city = await cityFactory.create({ name: 'München', language: 'de', districts: [] });
		testCitySource(harness.orm.em, city, CitySourceKindEnum.INSTAGRAM_HASHTAG, 'munichcafe');
		await harness.orm.em.flush();

		const res = await controller.suggestCitySources(city.id, { cuisineNotes: 'Bavarian, ramen' });

		const input = JSON.parse(agent.generate.mock.calls.at(-1)![0] as string);
		expect(input).toMatchObject({ city: 'München', language: 'de', cuisineNotes: 'Bavarian, ramen' });
		expect(input.existing).toEqual(['instagram_hashtag: munichcafe']);

		expect(res.items.map(i => `${i.kind}:${i.value}`)).toEqual([
			'tiktok_hashtag:munichfood',
			'tiktok_hashtag:muenchenfood',
			'tiktok_search:München Restaurant',
			'tiktok_search:best ramen munich',
		]);
		// "#MunichFood" and "munich food" are the same hashtag; the search differs only in case
		expect(res.skipped).toBe(4);
		expect(res.items.every(i => !i.enabled && i.suggested)).toBe(true);
		expect(res.items[0].note).toBe('Suggested: Locals tag their lunch with it');

		// The scrape reads enabled sources only
		expect(await cities.enabledValues(city.id, CitySourceKindEnum.TIKTOK_HASHTAG)).toEqual([]);

		// A second run only adds what is new
		const again = await controller.suggestCitySources(city.id, {});
		expect(again.items).toEqual([]);
	});

	it('enabling or turning off a suggestion reviews it', async () => {
		const city = await cityFactory.create({ districts: [] });
		const { items } = await controller.suggestCitySources(city.id, {});
		const [first, second] = items;

		const enabled = await controller.updateCitySource(city.id, first.id, { enabled: true });
		expect(enabled).toMatchObject({ enabled: true, suggested: false });
		const dismissed = await controller.updateCitySource(city.id, second.id, { enabled: false });
		expect(dismissed).toMatchObject({ enabled: false, suggested: false });
		// A note edit is no review
		const noted = await controller.updateCitySource(city.id, items[2].id, { note: 'maybe' });
		expect(noted).toMatchObject({ suggested: true });

		expect(await cities.enabledValues(city.id, first.kind)).toEqual([first.value]);
	});

	it('suggests districts with postal codes from the venue scrape', async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create({
			districts: [{ name: 'Mitte', postalCodes: [], neighbours: ['Pankow'] }],
		});
		const place = (n: number, district: string | null, postalCode: string | null) => {
			for (let i = 0; i < n; i++) {
				em.create(Venue, {
					city,
					placeId: `${city.slug}-${district}-${postalCode}-${i}`,
					name: `Venue ${i}`,
					district,
					postalCode,
				});
			}
		};
		place(5, 'Mitte', '10115');
		place(1, 'Pankow', '10115');
		place(4, 'Pankow', '10405');
		place(2, 'Mitte', '10405');
		place(3, 'Pankow', '10439');
		place(1, 'Potsdam', '14467');
		place(2, null, '10117');
		await em.flush();

		const { items } = await controller.listCityDistrictSuggestions(city.id);
		expect(items).toEqual([
			// Kept first with its own borders
			{ name: 'Mitte', postalCodes: ['10115'], neighbours: ['Pankow'], venues: 7, isNew: false },
			// New: borders from the shared postal code (2+ venues each side) and from Mitte's list
			{
				name: 'Pankow',
				postalCodes: ['10405', '10439'],
				neighbours: ['Mitte'],
				venues: 8,
				isNew: true,
			},
		]);
	});
});

describe('suggestDistricts', () => {
	it('lists each postal code once, ties going to the first name', () => {
		const res = suggestDistricts(
			[
				{ postalCode: '1', district: 'B', venues: 3 },
				{ postalCode: '1', district: 'A', venues: 3 },
				{ postalCode: '2', district: 'A', venues: 1 },
			],
			[],
		);
		expect(res.map(d => [d.name, d.postalCodes])).toEqual([
			['A', ['1', '2']],
			['B', []],
		]);
		expect(res[0].neighbours).toEqual(['B']);
	});

	it('leaves out a name with fewer venues than the floor', () => {
		expect(suggestDistricts([{ postalCode: '1', district: 'A', venues: 2 }], [])).toEqual([]);
	});
});
