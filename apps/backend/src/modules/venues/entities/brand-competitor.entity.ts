import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Brand } from './brand.entity.js';
import { Venue } from './venue.entity.js';

/** Who put a competitor on the list. */
export enum CompetitorPickedByEnum {
	ADMIN = 'admin',
	// The brand's own people, in the portal's settings
	OWNER = 'owner',
	// The bulk fill from the suggestions
	SUGGESTED = 'suggested',
}

/**
 * Competition picked for a brand (by an admin, its owner in the portal, or the bulk fill): one
 * place (`venue`) or a whole brand (`rival`), exactly one of the two. For the whole brand, or
 * for one of its branches (`branch`): a chain's branch competes locally. A report compares the
 * ones in its city (a branch's only in the branch's city); a rival brand counts with its
 * branches there. A place or rival is on a brand's list once, brand-wide or for one branch.
 * One way only: A competing with B says nothing about B's report.
 */
@Entity({ tableName: 'brand_competitors' })
@Unique({ properties: ['brand', 'venue'] })
@Unique({ properties: ['brand', 'rival'] })
export class BrandCompetitor extends MikroOrmSimpleEntityAbstractClass<'pickedBy'> {
	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade', index: true })
	brand: Rel<Brand>;

	// The brand's branch it competes with; null for the whole brand
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade', nullable: true, index: true })
	branch?: Rel<Venue> | null;

	// A competing place
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade', nullable: true, index: true })
	venue?: Rel<Venue> | null;

	// A competing brand, all its branches
	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade', nullable: true, index: true })
	rival?: Rel<Brand> | null;

	@Enum({
		items: () => CompetitorPickedByEnum,
		nativeEnumName: 'competitor_picked_by',
		default: CompetitorPickedByEnum.ADMIN,
	})
	pickedBy: CompetitorPickedByEnum = CompetitorPickedByEnum.ADMIN;
}
