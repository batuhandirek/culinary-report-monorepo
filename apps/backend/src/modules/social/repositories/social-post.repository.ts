import { EntityRepository } from '@mikro-orm/postgresql';

import { SocialPost } from '../entities/social-post.entity.js';

export class SocialPostRepository extends EntityRepository<SocialPost> {}
