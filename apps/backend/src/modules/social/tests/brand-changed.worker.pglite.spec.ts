import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import type { JobWithMetadata } from 'pg-boss';

import { CityService } from 'src/modules/cities/services/city.service.js';
import type { BrandChangedJobPayload } from 'src/modules/venues/jobs/brand-changed.job.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AccountMatchingService } from '../services/account-matching.service.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';
import { BrandChangedWorker } from '../workers/brand-changed.worker.js';

describe('BrandChangedWorker (pglite)', () => {
	let harness: PgliteTestingModule;
	let worker: BrandChangedWorker;
	const rematchBrands = jest.fn(async (..._args: unknown[]): Promise<unknown> => ({}));
	const match = jest.fn(async (..._args: unknown[]) => ({}));
	const scoreAll = jest.fn(async (..._args: unknown[]) => 0);
	const getById = jest.fn(async (id: string) => ({ id, name: 'Berlin' }));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandChangedWorker,
				{ provide: MentionMatchingService, useValue: { rematchBrands } },
				{ provide: AccountMatchingService, useValue: { match } },
				{ provide: CityService, useValue: { getById } },
				{ provide: BrandLeadScoreService, useValue: { scoreAll } },
			],
		});
		worker = harness.moduleRef.get(BrandChangedWorker);
	});

	afterAll(async () => {
		await harness.stop();
	});

	const job = {
		data: { brandIds: ['b1'], cityIds: ['c1'] },
	} as JobWithMetadata<BrandChangedJobPayload>;

	it('matches accounts and scores the cities even when the rematch fails, then fails the job', async () => {
		rematchBrands.mockRejectedValueOnce(new Error('You have no credits remaining'));
		await expect(worker.onBrandChanged(job)).rejects.toThrow('no credits remaining');
		expect(rematchBrands).toHaveBeenCalledWith(['b1']);
		expect(match).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
		expect(scoreAll).toHaveBeenCalledWith(expect.any(String), 'c1');
	});
});
