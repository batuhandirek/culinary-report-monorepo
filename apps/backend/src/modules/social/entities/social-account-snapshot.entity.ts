import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialAccount } from './social-account.entity.js';

/** What scrape saw the account's figures. */
export enum AccountSnapshotSourceEnum {
	// A profile scrape (`AccountScrapeService`): the profile and its latest posts
	PROFILE = 'profile',
	// A profile looked up for its handle on the other platform (`AccountTwinService`)
	LOOKUP = 'lookup',
	// A post's item, which repeats its author's follower count
	POST = 'post',
}

/**
 * An account's figures as one scrape saw them, at that moment: every scrape that gives a
 * follower count writes one (`SocialAccountService.recordSnapshot`), so an account has as many
 * as we came across it. Readers that want a month take the latest snapshot that closes it
 * (`util/account-snapshots.ts`). Fields a scrape doesn't give are null (unknown, not zero).
 */
@Entity({ tableName: 'social_account_snapshots' })
@Index({ properties: ['account', 'scrapedAt'] })
@Index({ properties: ['year', 'month'] })
export class SocialAccountSnapshot extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => SocialAccount, deleteRule: 'cascade' })
	account: Rel<SocialAccount>;

	@Property({ type: 'datetime' })
	scrapedAt: Date;

	// `scrapedAt`'s UTC calendar parts, for grouping in SQL
	@Property({ type: 'int' })
	year: number;

	// 1–12
	@Property({ type: 'int' })
	month: number;

	@Property({ type: 'int' })
	day: number;

	@Enum({ items: () => AccountSnapshotSourceEnum, nativeEnumName: 'account_snapshot_source' })
	source: AccountSnapshotSourceEnum;

	@Property({ type: 'int', nullable: true })
	followers?: number | null;

	// The accounts it follows
	@Property({ type: 'int', nullable: true })
	following?: number | null;

	// All posts (Instagram) or videos (TikTok) the profile shows
	@Property({ type: 'int', nullable: true })
	posts?: number | null;

	// Over its latest posts, ten at most (a profile scrape that saw them); Instagram shows views
	// for videos only
	@Property({ type: 'float', nullable: true })
	avgViews?: number | null;

	@Property({ type: 'float', nullable: true })
	avgLikes?: number | null;

	// Of those latest posts, the ones in the 30 days before the scrape
	@Property({ type: 'int', nullable: true })
	postsLast30Days?: number | null;
}
