import { Entity, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

/** An admin's "not one brand" on a suggestion (`BrandService.dismiss`): its key is never suggested again. */
@Entity({ tableName: 'brand_dismissals' })
export class BrandDismissal extends MikroOrmEntityAbstractClass {
	// `brandKey` of the suggested name
	@Property({ type: 'text', unique: true })
	key: string;

	// The name it was suggested under, for the admin
	@Property({ type: 'text' })
	name: string;
}
