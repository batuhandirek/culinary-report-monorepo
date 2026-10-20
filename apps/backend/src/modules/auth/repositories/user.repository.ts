import { EntityRepository } from '@mikro-orm/postgresql';

import { User } from '../entities/user.entity.js';

export class UserRepository extends EntityRepository<User> {}
