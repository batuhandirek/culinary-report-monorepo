import { BadRequestException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type {
	ReportData,
	ReportHighlights,
} from 'src/modules/reports/interfaces/report-data.interface.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { ReportConfigService } from 'src/modules/reports/services/report-config.service.js';
import { ReportTemplateService } from 'src/modules/reports/services/report-template.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import type { LeadSignals } from 'src/modules/venues/interfaces/lead-score.interface.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PitchHookAgent } from '../agents/pitch-hook.agent.js';
import { OutreachService } from '../services/outreach.service.js';
import { pitchHookInput, PitchHookService } from '../services/pitch-hook.service.js';

const HIGHLIGHTS: ReportHighlights = {
	title: 'The spit decides the stars',
	headline: 'Reviews held back on the meat.',
	highlights: [{ title: 'Meat', text: '9 of 14 reviews below 5 stars call the meat dry.' }],
	actions: [],
};

// Only what the hook reads; stored reports may lack the rest
const DATA = {
	social: { postCount: 6, views: 212000, creators: 4 },
	ownPosts: [],
	creators: [{ author: 'berlinfoodguide', platform: 'tiktok', views: 150000 }],
	reviews: {
		count: 34,
		written: 20,
		avgStars: 4.4,
		replyRate: 0.32,
		split: {
			belowFive: {
				written: 14,
				complaints: { food: 9, wait: 3, other: 2 },
				complaintDetails: [{ topic: 'food', detail: 'the vegan meat is dry' }],
			},
		},
		critical: [{ stars: 2, text: 'Dry meat, long wait.', replied: false }],
		changes: [{ changes: ['new owner'] }],
	},
} as unknown as ReportData;

const SIGNALS: LeadSignals = {
	month: '2026-09',
	buzz: { value: 0.8, weight: 30, inputs: { posts: 6, views: 212000 } },
	spends: { value: 0.2, weight: 15, inputs: { ownPosts: 1 } },
	problem: { value: 0.7, weight: 30, inputs: { unansweredCritical: 3 } },
	reachable: { value: 1, weight: 10, inputs: { website: true } },
	newPlaceBonus: 0,
	missing: [],
};

/* The hook a first email leads with is written from the brand's report when an admin adds it
 * without one, and again on "Suggest a hook". The agent is mocked. */
describe('Pitch hook (pglite)', () => {
	let harness: PgliteTestingModule;
	let outreach: OutreachService;
	const agent = mockAgent({
		hook: '“The vegan meat decides 5 stars or fewer: leave it on the spit longer.”',
	});
	const lastInput = () => JSON.parse(agent.generate.mock.calls.at(-1)![0] as string);

	let venueCount = 0;
	const venueWith = async ({ report = true, signals = false } = {}) => {
		const em = harness.orm.em;
		const city = testCity(em);
		const name = `Imbiss ${venueCount}`;
		const brand = em.create(Brand, { name, key: name.toLowerCase(), leadSignals: signals ? SIGNALS : null });
		em.create(Venue, {
			city,
			brand,
			placeId: `place-${venueCount++}`,
			name,
			category: 'Kebab shop',
			district: 'Neukölln',
		});
		if (report) {
			em.create(Report, {
				brand,
				city,
				month: '2026-08',
				data: DATA,
				highlights: { ...HIGHLIGHTS, title: 'Old' },
			});
			em.create(Report, { brand, city, month: '2026-09', data: DATA, highlights: HIGHLIGHTS });
		}
		await em.flush();
		return brand;
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				OutreachService,
				PitchHookService,
				ReportService,
				ReportConfigService,
				ReportTemplateService,
				{ provide: PitchHookAgent, useValue: agent },
			],
		});
		outreach = harness.moduleRef.get(OutreachService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		agent.generate.mockClear();
	});

	it('writes a hook for a prospect added without one, from its newest report, in its language', async () => {
		const brand = await venueWith({ signals: true });

		const prospect = await outreach.add(brand.id, { language: 'de' });

		expect(prospect.hook).toBe(
			'The vegan meat decides 5 stars or fewer: leave it on the spit longer.',
		);
		expect(agent.generate).toHaveBeenCalledTimes(1);
		const input = lastInput();
		expect(input.language).toBe('German');
		expect(input.venue).toEqual({
			name: brand.name,
			category: 'Kebab shop',
			district: 'Neukölln',
		});
		expect(input.report.title).toBe(HIGHLIGHTS.title);
		expect(input.report.reviews.criticisedBelowFiveStars).toEqual({
			food: '9 of 14',
			wait: '3 of 14',
		});
		expect(input.report.reviews.whatTheyCriticised).toEqual(['food: the vegan meat is dry']);
		expect(input.report.reviews.criticalReviews[0]).toMatchObject({ answered: false });
		expect(input.report.social.topCreators[0].handle).toBe('@berlinfoodguide');
		expect(input.leadSignals.problem).toEqual({ unansweredCritical: 3 });
	});

	it('keeps the hook a prospect was added with', async () => {
		const brand = await venueWith();

		const prospect = await outreach.add(brand.id, { hook: 'Typed by hand.' });

		expect(prospect.hook).toBe('Typed by hand.');
		expect(agent.generate).not.toHaveBeenCalled();
	});

	it('overwrites the hook on "Suggest a hook"', async () => {
		const brand = await venueWith();
		const added = await outreach.add(brand.id, { hook: 'Typed by hand.' });
		agent.generate.mockResolvedValueOnce({
			object: { hook: 'Your wait splits the stars.' },
			usage: undefined,
		});

		const prospect = await outreach.writeHook(added.id);

		expect(prospect.hook).toBe('Your wait splits the stars.');
		expect(lastInput().language).toBe('English');
	});

	it('writes from the lead signals alone when there is no report yet', async () => {
		const brand = await venueWith({ report: false, signals: true });

		const prospect = await outreach.add(brand.id);

		expect(prospect.hook).toBeTruthy();
		expect(lastInput().report).toBeNull();
	});

	it('makes no call without a report or lead signals, and refuses to suggest one', async () => {
		const brand = await venueWith({ report: false });

		const prospect = await outreach.add(brand.id);

		expect(prospect.hook).toBeNull();
		expect(agent.generate).not.toHaveBeenCalled();
		await expect(outreach.writeHook(prospect.id)).rejects.toBeInstanceOf(BadRequestException);
	});

	it('still adds the prospect when the call fails', async () => {
		const brand = await venueWith();
		agent.generate.mockRejectedValueOnce(new Error('rate limited'));

		const prospect = await outreach.add(brand.id);

		expect(prospect.id).toBeDefined();
		expect(prospect.hook).toBeFalsy();
	});

	it("names a chain, its branch count and no district", async () => {
		const em = harness.orm.em;
		const brand = await venueWith({ signals: true });
		em.create(Venue, { city: testCity(em), brand, placeId: `place-${venueCount++}`, name: 'Imbiss Kreuzberg', category: 'Kebab shop', district: 'Kreuzberg' });
		await em.flush();
		em.clear();

		await outreach.add(brand.id);

		expect(lastInput().venue).toEqual({ name: brand.name, category: 'Kebab shop', branches: 2 });
	});

	it('reads a stored report that predates fields without failing', () => {
		const venue = { name: 'Old', leadSignals: null, branches: { isInitialized: () => false } } as unknown as Brand;
		const report = {
			month: '2025-01',
			data: { social: { postCount: 0 } },
			highlights: { title: 'T', headline: 'H' },
		} as unknown as Report;

		const input = pitchHookInput(venue, report, 'en');

		expect(input.report?.findings).toEqual([]);
		expect(input.report?.social?.topCreators).toEqual([]);
		expect(input.leadSignals).toBeNull();
	});
});
