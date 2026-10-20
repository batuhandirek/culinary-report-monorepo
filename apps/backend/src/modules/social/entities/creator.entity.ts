import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialAccount } from './social-account.entity.js';

/**
 * The person (or business) behind one or more accounts: their TikTok and their Instagram are
 * one creator, so creator tables count them once. Every account has one: a new account gets a
 * creator of its own (`SocialAccountSubscriber`), or joins the one holding the same handle on the
 * other platform (`SocialAccountService`); an admin merges and splits them. A brand's own
 * accounts have one too, named like the account; they are the brand's voice, not word of mouth.
 */
@Entity({ tableName: 'creators' })
export class Creator extends MikroOrmEntityAbstractClass<'accounts'> {
	// What the admin pages call it: the first account's display name, else its handle
	@Property({ type: 'text' })
	name: string;

	@OneToMany(() => SocialAccount, account => account.creator)
	accounts = new Collection<SocialAccount>(this);
}
