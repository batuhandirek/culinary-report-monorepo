import { EntityRepository } from '@mikro-orm/postgresql';

import { Venue } from '../entities/venue.entity.js';

export class VenueRepository extends EntityRepository<Venue> {}
