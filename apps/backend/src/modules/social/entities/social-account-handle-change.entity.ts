import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialAccount } from './social-account.entity.js';
import { AccountSnapshotSourceEnum } from './social-account-snapshot.entity.js';

/**
 * One handle change of an account, as a scrape saw it: the platform's user id
 * (`SocialAccount.platformUserId`) came back under another handle. Written only by
 * `SocialAccountService.ensure`. `seenAt` is when we noticed, never when the person renamed.
 *
 * - A rename: `fromHandle` → `toHandle`.
 * - A handle someone else took: `toHandle` null, `takenBy` the account that has it now. The
 *   account keeps its row under a placeholder handle (`handleLostAt` set) until its user id shows
 *   up again, which writes a change from null (the handle in between is unknown) to the new one.
 */
@Entity({ tableName: 'social_account_handle_changes' })
export class SocialAccountHandleChange extends MikroOrmEntityAbstractClass<'takenBy'> {
	@ManyToOne({ entity: () => SocialAccount, index: true, deleteRule: 'cascade' })
	account: Rel<SocialAccount>;

	// Null when the account had lost its handle: what it was called in between is unknown
	@Property({ type: 'text', nullable: true })
	fromHandle?: string | null;

	// Null when another account took the handle and this one's new handle is not known yet
	@Property({ type: 'text', nullable: true })
	toHandle?: string | null;

	// The account that took `fromHandle` (another user id under it)
	@ManyToOne({ entity: () => SocialAccount, nullable: true, deleteRule: 'set null' })
	takenBy?: Rel<SocialAccount> | null;

	@Property({ type: 'datetime' })
	seenAt: Date;

	// What kind of scrape saw it
	@Enum({ items: () => AccountSnapshotSourceEnum, nativeEnumName: 'account_snapshot_source' })
	source: AccountSnapshotSourceEnum;
}
