import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from 'src/modules/pipeline/entities/pipeline-run.entity.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { DataCoverageService } from '../services/data-coverage.service.js';
import { TodayService } from '../services/today.service.js';

describe('TodayService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: TodayService;
	const now = new Date('2026-10-18T12:00:00Z');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TodayService,
				CityService,
				DataCoverageService,
				{ provide: BrandService, useValue: { suggestions: async () => [{}, {}] } },
				{ provide: FoodTopicService, useValue: { overview: async () => ({ unmapped: [{ key: 'kumpir' }] }) } },
				{ provide: ProspectQueryService, useValue: { due: async () => [], suggested: async () => [] } },
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
		const city = await cityFactory.create({ name: 'Berlin' });
		const replied = venueFactory.build({ name: 'Replied' }, { associations: { city } });
		const customer = venueFactory.build({ name: 'Customer' }, { associations: { city } });
		await em.flush();
		em.create(Prospect, { brand: replied.brand, stage: ProspectStageEnum.REPLIED });
		em.create(Prospect, { brand: customer.brand, stage: ProspectStageEnum.WON });
		const run = (step: PipelineStepEnum, status: PipelineRunStatusEnum, at: string) =>
			em.create(PipelineRun, {
				city,
				step,
				month: '2026-09',
				status,
				createdAt: new Date(at),
				finishedAt: new Date(at),
			});
		// A failure made good by a later run is history; one that wasn't is waiting
		run(PipelineStepEnum.SCRAPE_TIKTOK, PipelineRunStatusEnum.FAILED, '2026-10-16T06:00:00Z');
		run(PipelineStepEnum.SCRAPE_TIKTOK, PipelineRunStatusEnum.SUCCEEDED, '2026-10-16T07:00:00Z');
		run(PipelineStepEnum.SCRAPE_REVIEWS, PipelineRunStatusEnum.FAILED, '2026-10-16T08:00:00Z');
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
			sentiment: 'positive',
			summary: 'Good.',
			dishes: [],
			praise: [],
			complaints: [],
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
			[`words-${city.id}`, 'info'],
		]);
		expect(today.todos.find(t => t.key === 'failed-runs')?.text).toContain('1 pipeline run failed');
		expect(today.todos.find(t => t.key === 'replies')?.href).toBe('/admin/brands?segment=prospects&stage=REPLIED');
		expect(today.unmatchedPosts).toEqual([
			expect.objectContaining({ name: 'Mystery Spot', views: 12000, postId: post.id }),
		]);
	});
});
