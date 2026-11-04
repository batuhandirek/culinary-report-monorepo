import { EntityRepository } from '@mikro-orm/postgresql';

import { AnalystThread } from '../entities/analyst-thread.entity.js';

export class AnalystThreadRepository extends EntityRepository<AnalystThread> {}
