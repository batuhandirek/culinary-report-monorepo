import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { RatingSnapshotCron } from '../crons/rating-snapshot.cron.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('RatingSnapshotCron (pglite)', () => {
	let harness: PgliteTestingModule;
	const queueOnce = jest.fn(async () => ({}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [RatingSnapshotCron, CityService, { provide: PipelineService, useValue: { queueOnce } }],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('queues one SNAPSHOT_RATINGS run per city with the cron on, labelled with the current month', async () => {
		const berlin = cityFactory.build({ name: 'Berlin', cronEnabled: true });
		cityFactory.build({ name: 'By hand', cronEnabled: false });
		await harness.orm.em.flush();
		const now = new Date('2026-10-27T04:30:00Z');
		await harness.moduleRef.get(RatingSnapshotCron).queueAll(now);
		// Never twice in a day: a cron firing again around a restart paid the run twice (2026-11-03)
		expect(queueOnce.mock.calls).toEqual([[berlin.id, PipelineStepEnum.SNAPSHOT_RATINGS, '2026-10', 24, now]]);
	});
});
