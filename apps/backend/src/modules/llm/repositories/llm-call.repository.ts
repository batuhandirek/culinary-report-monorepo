import { EntityRepository } from '@mikro-orm/postgresql';

import { LlmCall } from '../entities/llm-call.entity.js';

export class LlmCallRepository extends EntityRepository<LlmCall> {}
