import { EntityRepository } from '@mikro-orm/postgresql';

import { Review } from '../entities/review.entity.js';

export class ReviewRepository extends EntityRepository<Review> {}
