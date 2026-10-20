import { type Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';

import { Visitor } from '../interfaces/visitor.interface.js';
import { UserSessionRepository } from '../repositories/user-session.repository.js';

import { User } from './user.entity.js';

@Entity({
	tableName: 'user_sessions',
	repository: () => UserSessionRepository,
})
export class UserSession extends MikroOrmEntityAbstractClass {
	@Property({ type: 'datetime' })
	expiresAt: Date;

	@ManyToOne({
		entity: () => User,
		deleteRule: 'cascade',
		updateRule: 'cascade',
	})
	user: Rel<User>;

	@Property({ type: 'jsonb' })
	visitorInfo: Visitor;

	// Platform the session was created from (web / ios / android). Known at login.
	@Enum({ items: () => Platform, nativeEnumName: 'user_session_platform', nullable: true })
	platform?: Platform;

	@Property({ type: 'datetime', nullable: true })
	lastSeenAt?: Date;
}
