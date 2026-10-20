import { OptionalProps } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ abstract: true })
export abstract class MikroOrmEntityAbstractClass<O = ''> {
	[OptionalProps]?: 'createdAt' | 'updatedAt' | O;

	@PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
	id: string;

	@Property({ type: 'datetime', defaultRaw: 'now()' })
	createdAt!: Date;

	@Property({ type: 'datetime', onUpdate: () => new Date(), defaultRaw: 'now()' })
	updatedAt!: Date;

	@Property({ type: 'timestamp', nullable: true })
	deletedAt?: Date | null;
}
