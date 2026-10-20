import { EntityRepository } from '@mikro-orm/postgresql';

import { UserSession } from '../entities/user-session.entity.js';

export class UserSessionRepository extends EntityRepository<UserSession> {}
