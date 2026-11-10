import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ASPECT_SEED } from 'src/modules/topics/constants/aspect-seed.constant.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminAspectsController } from '../controllers/admin.aspects.controller.js';
import { AdminExploreController } from '../controllers/admin.explore.controller.js';
import type { AdminAspectsOutputDto } from '../dto/admin-aspects.dto.js';
import { Statement } from '../entities/statement.entity.js';
import { AspectOverviewService } from '../services/aspect-overview.service.js';
import { StatementInsightService } from '../services/statement-insight.service.js';
import { foldAspectCounts } from '../util/aspect-counts.js';

import { addStatements, type TestClaim } from './factories/statement.factory.js';

/*
 * The Aspects pages' counts: a city's claims per aspect, a root's own plus its children's, all
 * time and per month of the window, the claims filed at a root itself, the labelled claims under
 * no aspect and the unread ones apart, another city's left out; and Explore's `loose` filter, the
 * claims under no aspect or at a root (what the page's "unfiled" groups read).
 */
describe('AspectOverviewService (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminAspectsController;
	let city: City;
	let out: AdminAspectsOutputDto;
	const row = (key: string) => out.aspects.find(a => a.key === key)!;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AspectOverviewService,
				AdminAspectsController,
				StatementInsightService,
				AdminExploreController,
				TopicService,
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		controller = harness.moduleRef.get(AdminAspectsController);
		const em = harness.orm.em;
		seedTopics(em, ASPECT_SEED.map(a => a.key));
		city = testCity(em);
		const elsewhere = testCity(em, { name: 'Hamburg' });
		const venue = venueFactory.build({ name: 'Döner Eck' }, { associations: { city } });
		const far = venueFactory.build({ name: 'Far Away' }, { associations: { city: elsewhere } });
		await em.flush();
		const index = await harness.moduleRef.get(TopicService).index();

		let n = 0;
		const review = (at: Venue, date: string, claims: TestClaim[]) =>
			addStatements(
				em,
				em.create(Review, {
					venue: at,
					reviewId: `ao-${n++}`,
					publishedAt: new Date(`${date}T12:00:00Z`),
					stars: 3,
					text: 'Written',
					analysedAt: new Date('2026-10-02T00:00:00Z'),
				}),
				claims,
				{ index },
			);
		review(venue, '2026-09-05', [
			{ text: 'long line', sentiment: 'negative', aspect: 'queue' },
			{ text: 'waited for a table', sentiment: 'negative', aspect: 'wait_for_table' },
			{ text: 'the waiting was fine', sentiment: 'neutral', aspect: 'wait' },
			{ text: 'came on a Tuesday', sentiment: 'neutral' },
		]);
		review(venue, '2026-08-10', [{ text: 'queue again', sentiment: 'negative', aspect: 'queue' }]);
		// Older than the window: in the all-time counts only
		review(venue, '2025-01-10', [{ text: 'old queue', sentiment: 'negative', aspect: 'queue' }]);
		const [unread] = review(venue, '2026-09-08', [{ text: 'not read yet' }]);
		unread.partsAt = null;
		review(far, '2026-09-05', [
			{ text: 'queue elsewhere', sentiment: 'negative', aspect: 'queue' },
			{ text: 'nothing elsewhere', sentiment: 'neutral' },
		]);
		await em.flush();
		em.clear();
		out = await controller.getAspects({ cityId: city.id, month: '2026-09' });
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('lists every aspect with its label, hint and root', () => {
		expect(out.aspects).toHaveLength(ASPECT_SEED.length);
		expect(row('queue')).toMatchObject({ label: 'Queue', parentKey: 'wait' });
		expect(row('queue').hint).toBeTruthy();
		expect(row('wait').parentKey).toBeUndefined();
	});

	it('counts a leaf all time and per month of the window, other cities out', () => {
		expect(out.months).toHaveLength(12);
		expect(out.months.at(-1)).toBe('2026-09');
		expect(row('queue')).toMatchObject({ claims: 3, atItself: 3 });
		expect(row('queue').byMonth.at(-1)).toBe(1);
		expect(row('queue').byMonth.at(-2)).toBe(1);
		expect(row('queue').byMonth.reduce((a, b) => a + b, 0)).toBe(2);
	});

	it("counts a root's own claims and its children's, and the ones at itself apart", () => {
		expect(row('wait')).toMatchObject({ claims: 5, atItself: 1 });
		expect(row('wait').byMonth.at(-1)).toBe(3);
		expect(row('wait').atItselfByMonth.at(-1)).toBe(1);
		expect(row('price')).toMatchObject({ claims: 0, atItself: 0 });
	});

	it('counts the claims under no aspect and the unread ones apart', () => {
		expect(out.noAspect).toMatchObject({ claims: 1 });
		expect(out.noAspect.byMonth.at(-1)).toBe(1);
		expect(out.unread).toMatchObject({ claims: 1 });
	});

	it('defaults to the last whole month', async () => {
		const res = await controller.getAspects({ cityId: city.id });
		expect(res.months).toHaveLength(12);
		expect(res.month).toBe(res.months.at(-1));
	});

	it('Explore narrows to the loose claims: under no aspect or at a root', async () => {
		const explore = harness.moduleRef.get(AdminExploreController);
		const res = await explore.listExploreClaims({
			cityId: city.id,
			from: '2026-09',
			to: '2026-09',
			loose: true,
			page: 1,
			size: 50,
		});
		const texts = res.items.map(i => (i as unknown as Statement).text).sort();
		expect(texts).toEqual(['came on a Tuesday', 'not read yet', 'the waiting was fine']);
	});
});

describe('foldAspectCounts', () => {
	it('adds a claim to its aspect and every ancestor once, a month outside the window all time only', () => {
		const counts = foldAspectCounts(
			[
				{ id: 'root', parentId: null },
				{ id: 'mid', parentId: 'root' },
				{ id: 'leaf', parentId: 'mid' },
			],
			[
				{ topicId: 'leaf', month: '2026-09', claims: 2 },
				{ topicId: 'root', month: '2026-08', claims: 1 },
				{ topicId: 'gone', month: '2026-09', claims: 5 },
			],
			['2026-09'],
		);
		expect(counts.get('root')).toEqual({ claims: 3, byMonth: [2], atItself: 1, atItselfByMonth: [0] });
		expect(counts.get('mid')).toEqual({ claims: 2, byMonth: [2], atItself: 0, atItselfByMonth: [0] });
		expect(counts.get('leaf')).toEqual({ claims: 2, byMonth: [2], atItself: 2, atItselfByMonth: [2] });
	});
});
