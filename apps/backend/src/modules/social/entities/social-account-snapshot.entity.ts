import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialAccount } from './social-account.entity.js';

/**
 * An account as it stood when a month closed: one profile scrape. The averages are over its
 * latest posts (ten at most), so they say what one post of theirs reaches.
 */
@Entity({ tableName: 'social_account_snapshots' })
@Unique({ properties: ['account', 'month'] })
export class SocialAccountSnapshot extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => SocialAccount, deleteRule: 'cascade' })
	account: Rel<SocialAccount>;

	// The month the scrape closes, `YYYY-MM`
	@Property({ type: 'text' })
	month: string;

	@Property({ type: 'int', nullable: true })
	followers?: number | null;

	// All posts (Instagram) or videos (TikTok) the profile shows
	@Property({ type: 'int', nullable: true })
	posts?: number | null;

	// Over the latest posts scraped; Instagram shows views for videos only
	@Property({ type: 'float', nullable: true })
	avgViews?: number | null;

	@Property({ type: 'float', nullable: true })
	avgLikes?: number | null;

	// Of the latest posts scraped, those in the 30 days before the scrape
	@Property({ type: 'int', nullable: true })
	postsLast30Days?: number | null;

	@Property({ type: 'datetime' })
	scrapedAt: Date;
}
