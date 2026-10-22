import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum, RESERVATION_SAMPLE_MAX_VENUES } from '../constants/pipeline.constant.js';
import { DemandSampleCron } from '../crons/demand-sample.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';
import { dueDemandSteps } from '../util/demand-schedule.js';

describe('dueDemandSteps', () => {
	it('samples at 19:00 local on Thursdays (with reservations) and Saturdays', () => {
		// 15 Oct 2026 is a Thursday; Berlin is UTC+2 until the 25th
		expect(dueDemandSteps(new Date('2026-10-15T17:00:00Z'), 'Europe/Berlin')).toEqual([
			PipelineStepEnum.SAMPLE_BUSYNESS,
			PipelineStepEnum.SAMPLE_RESERVATIONS,
		]);
		expect(dueDemandSteps(new Date('2026-10-17T17:30:00Z'), 'Europe/Berlin')).toEqual([
			PipelineStepEnum.SAMPLE_BUSYNESS,
		]);
		// Winter time: 19:00 in Berlin is 18:00 UTC
		expect(dueDemandSteps(new Date('2026-11-05T18:00:00Z'), 'Europe/Berlin')).toHaveLength(2);
		expect(dueDemandSteps(new Date('2026-10-15T19:00:00Z'), 'Europe/Berlin')).toEqual([]);
		expect(dueDemandSteps(new Date('2026-10-16T17:00:00Z'), 'Europe/Berlin')).toEqual([]);
		// Another time zone samples at its own 19:00
		expect(dueDemandSteps(new Date('2026-10-15T23:00:00Z'), 'America/New_York')).toHaveLength(2);
	});
});

describe('Demand sampling (pglite)', () => {
	let harness: PgliteTestingModule;
	const sendJob = jest.fn(async () => 'job-id');
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	const sample = jest.fn<(venues: Venue[], budgetUsd: number) => Promise<Record<string, number>>>();
	const sampleReservations =
		jest.fn<
			(venues: Venue[], city: unknown, budgetUsd: number, options?: { maxVenues?: number }) => Promise<Record<string, unknown>>
		>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				DemandSampleCron,
				PipelineService,
				CityService,
				ProspectQueryService,
				CompetitorService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: VenueBusynessService, useValue: { sample } },
				{ provide: VenueReservationService, useValue: { sample: sampleReservations } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('queues the due steps for cities with the cron on, for the last report month', async () => {
		const berlin = cityFactory.build({ name: 'Berlin', cronEnabled: true });
		cityFactory.build({ name: 'By hand', cronEnabled: false });
		await harness.orm.em.flush();

		await harness.moduleRef.get(DemandSampleCron).queueDue(new Date('2026-10-15T17:05:00Z'));

		harness.orm.em.clear();
		const runs = await harness.orm.em.find(PipelineRun, {}, { populate: ['city'] });
		expect(runs.map(r => [r.city.name, r.step, r.month]).sort()).toEqual(
			[
				['Berlin', PipelineStepEnum.SAMPLE_BUSYNESS, '2026-09'],
				['Berlin', PipelineStepEnum.SAMPLE_RESERVATIONS, '2026-09'],
			].sort(),
		);
		expect(berlin.timezone).toBe('Europe/Berlin');
	});

	it("samples the report brands' branches, won prospects and their competitors on the $1 default", async () => {
		const em = harness.orm.em;
		const city = cityFactory.build({ name: 'Sampled' });
		const venue = (name: string) =>
			em.create(Venue, { city, placeId: `place-${name}`, name, brand: em.create(Brand, { name, key: name }) });
		const ranked = venue('Ranked');
		const subscriber = venue('Subscriber');
		const rival = venue('Rival');
		venue('Nobody');
		em.create(Prospect, { brand: subscriber.brand, stage: ProspectStageEnum.WON });
		em.create(BrandCompetitor, { brand: ranked.brand, venue: rival });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SAMPLE_BUSYNESS,
			month: '2026-09',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		topBrandIds.mockResolvedValue([ranked.brand.id]);
		sample.mockResolvedValue({ requested: 3, sampled: 3, withPopularTimes: 2, withLive: 1 });

		await harness.moduleRef.get(PipelineService).execute(run.id);

		const [venues, budgetUsd] = sample.mock.calls[0];
		expect(venues.map(v => v.name).sort()).toEqual(['Ranked', 'Rival', 'Subscriber']);
		expect(budgetUsd).toBe(1);
		em.clear();
		const done = await em.findOneOrFail(PipelineRun, { id: run.id });
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result).toEqual({
			'1. SAMPLE_BUSYNESS': { requested: 3, sampled: 3, withPopularTimes: 2, withLive: 1, competitors: 1 },
		});
	});

	it("asks for reservations of every open venue with a link: won, report brands', competitors, then by their brand's lead score", async () => {
		const em = harness.orm.em;
		const city = cityFactory.build({ name: 'Booked' });
		const other = cityFactory.build({ name: 'Other' });
		const link = (id: string) => ({ details: { reserveTableUrl: `https://www.google.com/maps/reserve/v/dine/c/${id}` } });
		const venue = (name: string, extra: Partial<Venue> = {}, leadScore?: number) =>
			em.create(Venue, {
				city,
				placeId: `res-${name}`,
				name,
				...link(name),
				...extra,
				brand: em.create(Brand, { name, key: name, leadScore }),
			});
		const won = venue('won');
		const ranked = venue('ranked');
		const rival = venue('rival');
		// The rest: twelve by lead score, so the first ten come before the last two
		const rest = Array.from({ length: 12 }, (_, i) => venue(`rest${i}`, {}, 90 - i));
		const noLink = venue('nolink', { details: {} }, 99);
		venue('closed', { closed: true });
		const wonElsewhere = em.create(Venue, {
			city: other,
			placeId: 'res-won-there',
			name: 'won there',
			...link('x'),
			brand: em.create(Brand, { name: 'won there', key: 'won there' }),
		});
		em.create(Prospect, { brand: won.brand, stage: ProspectStageEnum.WON });
		em.create(Prospect, { brand: wonElsewhere.brand, stage: ProspectStageEnum.WON });
		em.create(BrandCompetitor, { brand: ranked.brand, venue: rival });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SAMPLE_RESERVATIONS,
			month: '2026-09',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		topBrandIds.mockResolvedValue([ranked.brand.id]);
		sampleReservations.mockResolvedValue({ venues: 16, noPlatform: 1, capped: 0, samples: 30, byPlatform: { google: 30 } });

		await harness.moduleRef.get(PipelineService).execute(run.id);

		const [venues, , budgetUsd, options] = sampleReservations.mock.calls[0];
		const names = venues.map(v => v.name);
		expect(names.slice(0, 3)).toEqual(['won', 'ranked', 'rival']);
		expect(new Set(names.slice(3, 13))).toEqual(new Set(rest.slice(0, 10).map(v => v.name)));
		expect(new Set(names.slice(13, 15))).toEqual(new Set(rest.slice(10).map(v => v.name)));
		// Without a link: last, counted as no platform; closed venues and other cities never
		expect(names.slice(15)).toEqual([noLink.name]);
		expect(budgetUsd).toBe(1);
		expect(options).toEqual({ maxVenues: RESERVATION_SAMPLE_MAX_VENUES });
		em.clear();
		expect((await em.findOneOrFail(PipelineRun, { id: run.id })).result).toEqual({
			'1. SAMPLE_RESERVATIONS': { venues: 16, noPlatform: 1, capped: 0, samples: 30, byPlatform: { google: 30 } },
		});
	});
});
