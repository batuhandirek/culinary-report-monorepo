import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { AnalystMessageStatusEnum } from '../constants/analyst-message-status.enum.constant.js';
import { AnalystMessageRepository } from '../repositories/analyst-message.repository.js';

import { AnalystMessagePart } from './analyst-message-part.entity.js';
import { AnalystThread } from './analyst-thread.entity.js';

export interface AnalystUsage {
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	cacheWriteTokens: number;
	steps: number;
	queries: number;
}

/**
 * A question (its author an admin) or an answer (its author the system account,
 * `UserService.getSystemUser`). What it says is its parts, in `position` order.
 */
@Entity({ tableName: 'analyst_messages', repository: () => AnalystMessageRepository })
@Index({ properties: ['thread', 'createdAt'] })
export class AnalystMessage extends MikroOrmEntityAbstractClass<'status'> {
	@ManyToOne({ entity: () => AnalystThread, deleteRule: 'cascade' })
	thread!: Rel<AnalystThread>;

	@ManyToOne({ entity: () => User, deleteRule: 'cascade' })
	author!: Rel<User>;

	@Enum({ items: () => AnalystMessageStatusEnum, nativeEnumName: 'analyst_message_status' })
	status: AnalystMessageStatusEnum = AnalystMessageStatusEnum.DONE;

	/** The model that answered (the roster may have moved the call); an answer's only */
	@Property({ type: 'text', nullable: true })
	model?: string | null;

	@Property({ type: 'double', nullable: true })
	usd?: number | null;

	@Property({ type: 'jsonb', nullable: true })
	usage?: AnalystUsage | null;

	@Property({ type: 'datetime', nullable: true })
	finishedAt?: Date | null;

	@OneToMany({
		entity: () => AnalystMessagePart,
		mappedBy: 'message',
		orderBy: { position: 'asc' },
	})
	parts = new Collection<AnalystMessagePart>(this);
}
