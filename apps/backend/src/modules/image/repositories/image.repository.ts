import { EntityRepository } from '@mikro-orm/postgresql';

import { Image } from '../entities/image.entity.js';

export class ImageRepository extends EntityRepository<Image> {}
