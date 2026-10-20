import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { Report } from './report.entity.js';

/**
 * A private link to a report (`/r/<token>`): anyone holding the token reads the report without
 * logging in, until an admin revokes it. Counts how often it was opened, the signal to follow up.
 */
@Entity({ tableName: 'report_shares' })
export class ReportShare extends MikroOrmEntityAbstractClass<'openCount'> {
	@ManyToOne({ entity: () => Report, deleteRule: 'cascade', index: true })
	report: Rel<Report>;

	// 22 URL-safe random characters (128 bits): the only thing guarding the report
	@Property({ type: 'text', unique: true })
	token: string;

	// Empty when the system made it (a report e-mail)
	@ManyToOne({ entity: () => User, nullable: true, deleteRule: 'set null' })
	createdBy?: Rel<User> | null;

	@Property({ type: 'datetime', nullable: true })
	revokedAt?: Date | null;

	// Opens in a browser by someone who is not an admin
	@Property({ type: 'int', default: 0 })
	openCount: number = 0;

	@Property({ type: 'datetime', nullable: true })
	lastOpenedAt?: Date | null;
}
