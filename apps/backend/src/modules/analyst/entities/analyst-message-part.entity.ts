import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import type { AnalystPartData } from 'sdk';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { AnalystMessagePartRepository } from '../repositories/analyst-message-part.repository.js';

import { AnalystMessage } from './analyst-message.entity.js';

/**
 * One piece of a message, kept as it happened: a question's text and the entities it referenced;
 * an answer's text as the model wrote it between steps, its plan, each query it ran with the rows
 * (the steps an admin can open), each lookup, an error. `data.type` says which (`AnalystPartData`
 * in `sdk`, shared with the page).
 */
@Entity({ tableName: 'analyst_message_parts', repository: () => AnalystMessagePartRepository })
@Index({ properties: ['message', 'position'] })
export class AnalystMessagePart extends MikroOrmEntityAbstractClass<'streaming'> {
	@ManyToOne({ entity: () => AnalystMessage, deleteRule: 'cascade' })
	message!: Rel<AnalystMessage>;

	@Property({ type: 'int' })
	position!: number;

	@Property({ type: 'jsonb' })
	data!: AnalystPartData;

	/** Still being written: a text streaming in, a query running */
	@Property({ type: 'boolean', default: false })
	streaming: boolean = false;
}
