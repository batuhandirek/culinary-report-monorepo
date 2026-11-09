import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { getEntityManager } from 'src/shared/util/em.js';

import { ApifyRun, ApifyRunStatusEnum } from '../../entities/apify-run.entity.js';

/** An `ApifyRun` row, RUNNING with a $5 cap unless told otherwise */
export const apifyRunFactory = Factory.define<ApifyRun>(({ params, onCreate }) => {
	onCreate(async run => {
		await getEntityManager().flush();
		return run;
	});
	return getEntityManager().create(ApifyRun, {
		actorId: 'compass/Google-Maps-Reviews-Scraper',
		purpose: faker.lorem.words(3),
		status: ApifyRunStatusEnum.RUNNING,
		maxCostUsd: 5,
		apifyRunId: faker.string.alphanumeric(17),
		...params,
	});
});
