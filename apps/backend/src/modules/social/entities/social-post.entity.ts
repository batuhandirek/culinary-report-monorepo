import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialPostRepository } from '../repositories/social-post.repository.js';

import { Mention } from './mention.entity.js';
import { SocialAccount } from './social-account.entity.js';

export enum SocialPlatformEnum {
	TIKTOK = 'tiktok',
	INSTAGRAM = 'instagram',
}

/** A TikTok video or an Instagram post about food and drink in the city. */
@Entity({ tableName: 'social_posts', repository: () => SocialPostRepository })
export class SocialPost extends MikroOrmEntityAbstractClass<
	'views' | 'likes' | 'shares' | 'comments' | 'saves' | 'isAd' | 'mentions'
> {
	// The platform's own id: a TikTok video id, or `ig_<postId>` for Instagram
	@Property({ type: 'text', unique: true })
	externalId: string;

	@Index()
	@Enum({ items: () => SocialPlatformEnum, nativeEnumName: 'social_platform' })
	platform: SocialPlatformEnum;

	// The city whose scrape found it first: its mentions are matched against that city's venues
	@ManyToOne({ entity: () => City, index: true })
	city: Rel<City>;

	@Property({ type: 'text' })
	url: string;

	@Index()
	@Property({ type: 'datetime' })
	postedAt: Date;

	// The account's handle, kept on the post for search and display
	@Property({ type: 'text', nullable: true })
	author?: string | null;

	// Who posted it (`SocialAccountService.ensureFor` on save); null without an author
	@ManyToOne({ entity: () => SocialAccount, nullable: true, index: true, deleteRule: 'set null' })
	account?: Rel<SocialAccount> | null;

	@Property({ type: 'int', nullable: true })
	authorFans?: number | null;

	@Property({ type: 'int', default: 0 })
	views: number = 0;

	@Property({ type: 'int', default: 0 })
	likes: number = 0;

	@Property({ type: 'int', default: 0 })
	shares: number = 0;

	@Property({ type: 'int', default: 0 })
	comments: number = 0;

	@Property({ type: 'int', default: 0 })
	saves: number = 0;

	// Marked as an ad or a paid partnership by the platform
	@Property({ type: 'boolean', default: false })
	isAd: boolean = false;

	// The place the creator tagged, if any
	@Property({ type: 'text', nullable: true })
	locationName?: string | null;

	// How it was found: `#hashtag`, `search:<query>` or `place:<venue>`
	@Property({ type: 'text', nullable: true })
	source?: string | null;

	@Property({ type: 'text', nullable: true })
	text?: string | null;

	@Property({ type: 'jsonb', nullable: true })
	hashtags?: string[] | null;

	@Property({ type: 'jsonb', nullable: true })
	taggedHandles?: string[] | null;

	@Property({ type: 'text', nullable: true })
	subtitles?: string | null;

	@Property({ type: 'text', nullable: true })
	subtitlesLanguage?: string | null;

	// Filled by mention extraction
	@Property({ type: 'datetime', nullable: true })
	analysedAt?: Date | null;

	// Paid, gifted or invited, as the LLM read the caption
	@Property({ type: 'boolean', nullable: true })
	isPromotional?: boolean | null;

	@Property({ type: 'int', nullable: true })
	analysisTokens?: number | null;

	// When its comments were scraped (`PostComment`): once per post, a rescrape would pay again
	@Property({ type: 'datetime', nullable: true })
	commentsScrapedAt?: Date | null;

	// The comment analysis's one line on what the disagreeing comments say; null when none do
	@Property({ type: 'text', nullable: true })
	commentsDisagreement?: string | null;

	@OneToMany(() => Mention, mention => mention.post)
	mentions = new Collection<Mention>(this);
}
