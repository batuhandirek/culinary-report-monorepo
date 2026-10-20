import { OptionalProps } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ abstract: true })
export abstract class MikroOrmSimpleEntityAbstractClass<O = ''> {
	[OptionalProps]?: 'createdAt' | 'updatedAt' | O;

	@PrimaryKey({ type: 'integer', autoincrement: true })
	id: number;

	@Property({ type: 'datetime', defaultRaw: 'now()' })
	createdAt!: Date;
}
