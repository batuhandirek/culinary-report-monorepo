import { EntityRepository } from '@mikro-orm/postgresql';

import { Mention } from '../entities/mention.entity.js';

export class MentionRepository extends EntityRepository<Mention> {}
