import { EntityRepository } from '@mikro-orm/postgresql';

import { BlogEntry } from '../entities/blog-entry.entity.js';

export class BlogEntryRepository extends EntityRepository<BlogEntry> {}
