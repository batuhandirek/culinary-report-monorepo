import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { ApifyRun, ApifyRunStatusEnum } from 'src/modules/apify/entities/apify-run.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type {
	ReportData,
	ReportHighlights,
} from 'src/modules/reports/interfaces/report-data.interface.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { OverviewService } from '../services/overview.service.js';
import { nextMonthlyRunAt } from '../util/monthly-schedule.js';

import { fakeDurable } from './fake-durable.js';

describe('nextMonthlyRunAt', () => {
	it('is the 2nd at 06:00 UTC, this month until it has passed', () => {
		expect(nextMonthlyRunAt(new Date('2026-10-01T23:00:00Z'))).toEqual(
			new Date('2026-10-02T06:00:00Z'),
		);
		expect(nextMonthlyRunAt(new Date('2026-10-02T06:00:00Z'))).toEqual(
			new Date('2026-11-02T06:00:00Z'),
		);
		expect(nextMonthlyRunAt(new Date('2026-12-17T09:00:00Z'))).toEqual(
			new Date('2027-01-02T06:00:00Z'),
		);
	});
});

describe('OverviewService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: OverviewService;
	const durable = fakeDurable();
	const now = new Date('2026-10-17T09:00:00Z');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				OverviewService,
				{ provide: DurableWorkflowsService, useValue: durable },
				OutreachService,
				ProspectQueryService,
				BrandLeadScoreService,
			],
		});
		service = harness.moduleRef.get(OverviewService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('reads blanks, not zeros, for what is not there yet', async () => {
		const overview = await service.get(now);
		expect(overview).toMatchObject({
			reportMonth: '2026-09',
			lastMonthlyRun: null,
			lastRun: null,
			nextMonthlyRunAt: new Date('2026-11-02T06:00:00Z'),
			apifyMonthCostUsd: 0,
			apifyMonthlyCreditUsd: 250,
			reportsBuilt: 0,
			unmatchedMentions: 0,
			outreach: { due: 0, outreachLast7Days: 0 },
			dueFollowUps: [],
			suggestedProspects: [],
		});
	});

	it('sums up the run, the spend, the reports and the sales list', async () => {
		const em = harness.orm.em;
		// A one-branch brand per venue, the lead score on the brand
		const venue = (name: string, leadScore: number | null = null) =>
			em.create(Venue, {
				city: testCity(em),
				placeId: `place-${name}`,
				name,
				brand: em.create(Brand, { name, key: name.toLowerCase(), leadScore }),
			});
		const reported = venue('Reported');
		const overdue = venue('Overdue', 90);
		const later = venue('Later');
		venue('Suggested', 80);

		const cityId = 'city-1';
		// The newest month run failed; a daily run since succeeded (DBOS's runs, faked)
		durable.state.runs = [
			{
				workflowID: `scrape-reviews.month-${cityId}-2026-09`,
				workflowName: 'scrape-reviews.month',
				status: 'ERROR',
				error: { message: 'Apify said no' },
				attributes: { cityId, purpose: 'scrape-reviews', period: '2026-09' },
				createdAt: '2026-10-02T06:00:00Z',
			},
			{
				workflowID: `post-counts.day-${cityId}-2026-10-17`,
				workflowName: 'post-counts.day',
				status: 'SUCCESS',
				attributes: { cityId, purpose: 'post-counts', period: '2026-10-17' },
				createdAt: '2026-10-17T08:00:00Z',
			},
		];
		const apifyRun = (costUsd: number, createdAt?: Date) =>
			em.create(ApifyRun, {
				actorId: 'actor',
				purpose: 'test',
				status: ApifyRunStatusEnum.SUCCEEDED,
				maxCostUsd: 10,
				costUsd,
				...(createdAt && { createdAt }),
			});
		apifyRun(2.5);
		apifyRun(1.25);
		apifyRun(100, new Date('2020-01-15T00:00:00Z'));
		em.create(Report, {
			brand: reported.brand,
			city: reported.city,
			month: '2026-09',
			data: {} as ReportData,
			highlights: { title: 'T', headline: 'H' } as ReportHighlights,
		});
		em.create(Report, {
			brand: reported.brand,
			city: reported.city,
			month: '2026-08',
			data: {} as ReportData,
			highlights: { title: 'T', headline: 'H' } as ReportHighlights,
		});
		const post = em.create(SocialPost, {
			city: testCity(em),
			externalId: 't1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/t1',
			postedAt: new Date('2026-09-10T00:00:00Z'),
			author: 'foodie',
		});
		const mention = (matchMethod: MentionMatchMethodEnum) =>
			em.create(Mention, {
				post,
				venueName: 'Somewhere',
				matchMethod,
				visited: true,
			});
		mention(MentionMatchMethodEnum.NONE);
		mention(MentionMatchMethodEnum.NONE);
		mention(MentionMatchMethodEnum.OTHER_CITY);
		em.create(Prospect, {
			brand: overdue.brand,
			stage: ProspectStageEnum.CONTACTED,
			nextFollowUpAt: new Date('2026-10-15T09:00:00Z'),
		});
		em.create(Prospect, {
			brand: later.brand,
			stage: ProspectStageEnum.CONTACTED,
			nextFollowUpAt: new Date('2026-10-20T09:00:00Z'),
		});
		await em.flush();
		em.clear();

		const overview = await service.get(now);

		expect(overview.lastMonthlyRun).toMatchObject({
			workflow: 'scrape-reviews.month',
			status: 'ERROR',
			period: '2026-09',
			error: 'Apify said no',
		});
		expect(overview.lastRun).toMatchObject({
			workflow: 'post-counts.day',
			status: 'SUCCESS',
			cityId: expect.any(String),
		});
		expect(overview.apifyMonthCostUsd).toBeCloseTo(3.75);
		expect(overview.reportsBuilt).toBe(1);
		expect(overview.unmatchedMentions).toBe(2);
		expect(overview.outreach?.due).toBe(1);
		expect(overview.dueFollowUps?.map(p => p.brand.name)).toEqual(['Overdue']);
		// The overdue venue scores higher but is a prospect already
		expect(overview.suggestedProspects?.map(v => v.name)).toEqual(['Suggested']);
	});
});
