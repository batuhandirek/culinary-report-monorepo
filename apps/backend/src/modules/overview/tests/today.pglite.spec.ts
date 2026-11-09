import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { DataCoverageService } from '../services/data-coverage.service.js';
import { TodayService } from '../services/today.service.js';

import { fakeDurable } from './fake-durable.js';

describe('TodayService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: TodayService;
	const durable = fakeDurable();
	const now = new Date('2026-10-18T12:00:00Z');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TodayService,
				CityService,
				{ provide: DurableWorkflowsService, useValue: durable },
				DataCoverageService,
				{ provide: BrandService, useValue: { suggestions: async () => [{}, {}] } },
				{
					provide: ProspectQueryService,
					useValue: { due: async () => [], suggested: async () => [] },
				},
			],
		});
		service = harness.moduleRef.get(TodayService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('lists what waits on an admin, most pressing first, each with where it is done', async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create({ name: 'Berlin', cronEnabled: true });
		const replied = venueFactory.build({ name: 'Replied' }, { associations: { city } });
		const customer = venueFactory.build({ name: 'Customer' }, { associations: { city } });
		await em.flush();
		em.create(Prospect, { brand: replied.brand, stage: ProspectStageEnum.REPLIED });
		em.create(Prospect, { brand: customer.brand, stage: ProspectStageEnum.WON });
		// A failure a later run made good is history; one that wasn't is waiting (DBOS's runs, faked)
		const run = (workflowName: string, status: string, period: string, at: string) => ({
			workflowID: `${workflowName}-${city.id}-${period}-${at}`,
			workflowName,
			status,
			attributes: { cityId: city.id, purpose: workflowName.split('.')[0], period },
			createdAt: at,
		});
		durable.state.runs = [
			run('post-counts.day', 'ERROR', '2026-10-16', '2026-10-16T05:30:00Z'),
			run('post-counts.day', 'SUCCESS', '2026-10-17', '2026-10-17T05:30:00Z'),
			run('scrape-reviews.month', 'ERROR', '2026-09', '2026-10-16T08:00:00Z'),
		];
		const post = em.create(SocialPost, {
			city,
			externalId: 'today-1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/today-1',
			postedAt: new Date('2026-09-20T10:00:00Z'),
			views: 12000,
		});
		em.create(Mention, {
			post,
			venueName: 'Mystery Spot',
			visited: true,
			matchMethod: MentionMatchMethodEnum.NONE,
		});
		await em.flush();

		const today = await service.today(now);

		expect(today.reportMonth).toBe('2026-09');
		expect(today.todos.map(t => [t.key, t.tone])).toEqual([
			['replies', 'urgent'],
			['customer-reports', 'urgent'],
			['failed-runs', 'todo'],
			[`coverage-${city.id}`, 'todo'],
			['unmatched', 'info'],
			[`merges-${city.id}`, 'info'],
		]);
		const failed = today.todos.find(t => t.key === 'failed-runs');
		expect(failed?.text).toContain('1 pipeline run failed');
		expect(failed?.href).toBe(
			`/admin/workflows/${encodeURIComponent(`scrape-reviews.month-${city.id}-2026-09-2026-10-16T08:00:00Z`)}`,
		);
		expect(today.todos.find(t => t.key === 'replies')?.href).toBe(
			'/admin/brands?segment=prospects&stage=REPLIED',
		);
		expect(today.unmatchedPosts).toEqual([
			expect.objectContaining({ name: 'Mystery Spot', views: 12000, postId: post.id }),
		]);
	});
});
