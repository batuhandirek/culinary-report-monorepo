import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { AnalystThreadRepository } from '../repositories/analyst-thread.repository.js';

import { AnalystMessage } from './analyst-message.entity.js';

/**
 * One conversation with the analyst (`/admin/ask`): an admin's questions and the analyst's answers,
 * each answer reading the ones before it. Its owner is the admin who started it; every admin sees
 * every thread (they share the data).
 */
@Entity({ tableName: 'analyst_threads', repository: () => AnalystThreadRepository })
export class AnalystThread extends MikroOrmEntityAbstractClass<'lastMessageAt' | 'usd'> {
	/** The first question's opening words until someone renames it */
	@Property({ type: 'text' })
	title!: string;

	@ManyToOne({ entity: () => User, deleteRule: 'cascade' })
	@Index()
	owner!: Rel<User>;

	/** Orders the list; stamped by every new message */
	@Property({ type: 'datetime', defaultRaw: 'now()' })
	lastMessageAt: Date = new Date();

	/** Dollars the thread's answers cost (OpenAI's allowance counts as 0) */
	@Property({ type: 'double', default: 0 })
	usd: number = 0;

	@OneToMany({ entity: () => AnalystMessage, mappedBy: 'thread' })
	messages = new Collection<AnalystMessage>(this);
}
