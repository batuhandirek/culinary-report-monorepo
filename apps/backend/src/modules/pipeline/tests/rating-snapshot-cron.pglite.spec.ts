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
	const queue = jest.fn(async () => ({}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [RatingSnapshotCron, CityService, { provide: PipelineService, useValue: { queue } }],
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
		await harness.moduleRef.get(RatingSnapshotCron).queueAll(new Date('2026-10-27T04:30:00Z'));
		expect(queue.mock.calls).toEqual([[berlin.id, PipelineStepEnum.SNAPSHOT_RATINGS, '2026-10']]);
	});
});
