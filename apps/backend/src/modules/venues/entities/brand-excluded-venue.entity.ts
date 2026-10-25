import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Brand } from './brand.entity.js';
import { Venue } from './venue.entity.js';

/**
 * A place with a matching name an admin said is not the brand's branch: never offered or joined
 * again (`BrandService`, its one writer). Goes with the brand or the venue; moves to the
 * surviving brand on a merge.
 */
@Entity({ tableName: 'brand_excluded_venues' })
@Unique({ properties: ['brand', 'venue'] })
@Index({ properties: ['venue'] })
export class BrandExcludedVenue extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade' })
	brand: Rel<Brand>;

	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;
}
