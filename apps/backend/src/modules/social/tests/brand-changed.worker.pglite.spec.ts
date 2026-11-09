import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import type { JobWithMetadata } from 'pg-boss';

import { CityService } from 'src/modules/cities/services/city.service.js';
import type { BrandChangedJobPayload } from 'src/modules/venues/jobs/brand-changed.job.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AccountMatchingService } from '../services/account-matching.service.js';
import { HashtagService } from '../services/hashtag.service.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';
import { BrandChangedWorker } from '../workers/brand-changed.worker.js';

describe('BrandChangedWorker (pglite)', () => {
	let harness: PgliteTestingModule;
	let worker: BrandChangedWorker;
	const rematchBrands = jest.fn(async (..._args: unknown[]): Promise<unknown> => ({}));
	const match = jest.fn(async (..._args: unknown[]) => ({}));
	const scoreAll = jest.fn(async (..._args: unknown[]) => 0);
	const getById = jest.fn(async (id: string) => ({ id, name: 'Berlin' }));
	const relink = jest.fn(async () => ({ tags: 0, changed: 0 }));
	const order: string[] = [];

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandChangedWorker,
				{ provide: MentionMatchingService, useValue: { rematchBrands } },
				{ provide: AccountMatchingService, useValue: { match } },
				{ provide: CityService, useValue: { getById } },
				{ provide: BrandLeadScoreService, useValue: { scoreAll } },
				{ provide: HashtagService, useValue: { relink } },
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

	it("rematches the brands' mentions in code first, then the cities' accounts, scores and tags", async () => {
		for (const [name, fn] of Object.entries({ rematchBrands, match, scoreAll, relink }))
			(fn as jest.Mock).mockImplementation((async () => {
				order.push(name);
				return {};
			}) as never);

		await worker.onBrandChanged(job);
		expect(rematchBrands).toHaveBeenCalledWith(['b1']);
		expect(match).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
		expect(scoreAll).toHaveBeenCalledWith(expect.any(String), 'c1');
		// Scored on the rematched mentions: the close calls keep their match until the city's run asks
		expect(order).toEqual(['rematchBrands', 'match', 'scoreAll', 'relink']);
	});
});
