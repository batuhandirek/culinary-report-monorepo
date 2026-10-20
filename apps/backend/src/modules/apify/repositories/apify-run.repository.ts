import { EntityRepository } from '@mikro-orm/postgresql';

import { ApifyRun } from '../entities/apify-run.entity.js';

export class ApifyRunRepository extends EntityRepository<ApifyRun> {}
