import { EntityRepository } from '@mikro-orm/postgresql';

import { BlogTag } from '../entities/blog-tag.entity.js';

export class BlogTagRepository extends EntityRepository<BlogTag> {}
