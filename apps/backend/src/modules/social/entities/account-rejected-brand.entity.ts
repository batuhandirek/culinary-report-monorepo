import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Unique } from '@mikro-orm/decorators/legacy';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { SocialAccount } from './social-account.entity.js';

/**
 * A brand an admin said the account is not: never linked to or suggested again
 * (`SocialAccountService`, its one writer). Moves to the surviving brand on a merge.
 */
@Entity({ tableName: 'account_rejected_brands' })
@Unique({ properties: ['account', 'brand'] })
@Index({ properties: ['brand'] })
export class AccountRejectedBrand extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => SocialAccount, deleteRule: 'cascade' })
	account: Rel<SocialAccount>;

	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade' })
	brand: Rel<Brand>;
}
