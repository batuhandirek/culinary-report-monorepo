import { EntityRepository } from '@mikro-orm/postgresql';

import { BrandMember } from '../entities/brand-member.entity.js';

export class BrandMemberRepository extends EntityRepository<BrandMember> {}
