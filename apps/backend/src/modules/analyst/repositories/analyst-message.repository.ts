import { EntityRepository } from '@mikro-orm/postgresql';

import { AnalystMessage } from '../entities/analyst-message.entity.js';

export class AnalystMessageRepository extends EntityRepository<AnalystMessage> {}
