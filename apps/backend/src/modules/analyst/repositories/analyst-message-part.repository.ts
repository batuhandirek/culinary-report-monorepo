import { EntityRepository } from '@mikro-orm/postgresql';

import { AnalystMessagePart } from '../entities/analyst-message-part.entity.js';

export class AnalystMessagePartRepository extends EntityRepository<AnalystMessagePart> {}
