import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialPostRepository } from '../repositories/social-post.repository.js';

import { Mention } from './mention.entity.js';
import { PostHashtag } from './post-hashtag.entity.js';
import { PostSource } from './post-source.entity.js';
import { SocialAccount } from './social-account.entity.js';
import { SocialPostSnapshot } from './social-post-snapshot.entity.js';

export enum SocialPlatformEnum {
	TIKTOK = 'tiktok',
	INSTAGRAM = 'instagram',
	// An article on a food blog the city lists as a source (`CitySourceKindEnum.BLOG`); the blog
	// is its account, and it has no views, likes or comments
	BLOG = 'blog',
}

/** A TikTok video, an Instagram post or a blog article about food and drink in the city. */
@Entity({ tableName: 'social_posts', repository: () => SocialPostRepository })
export class SocialPost extends MikroOrmEntityAbstractClass<
	'views' | 'likes' | 'shares' | 'comments' | 'saves' | 'isAd' | 'mentions' | 'hashtagLinks' | 'foundBy' | 'snapshots'
> {
	// The platform's own id: a TikTok video id, `ig_<postId>` for Instagram, `blog_<hash of the URL>`
	// for a blog article
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

	// The counts below are compared at one age: every read updates them until one at
	// `POST_COUNTS_AGE_DAYS` or later, which is kept (`countsFinalAt`); every read is also a
	// `snapshots` row. `SocialPostService.readCounts` is their one writer
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

	// When the counts were read: a scrape that found the post, or the refresh. Null for a blog
	// article, which has none
	@Property({ type: 'datetime', nullable: true })
	countsAt?: Date | null;

	// When the read at `POST_COUNTS_AGE_DAYS` or later was (a first find that late is one), or when
	// the refresh found the post deleted or private: the counts stay as they are from then on
	@Property({ type: 'datetime', nullable: true })
	countsFinalAt?: Date | null;

	// Marked as an ad or a paid partnership by the platform
	@Property({ type: 'boolean', default: false })
	isAd: boolean = false;

	// The place the creator tagged, if any
	@Property({ type: 'text', nullable: true })
	locationName?: string | null;

	// The caption; a blog article's title and text
	@Property({ type: 'text', nullable: true })
	text?: string | null;

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

	// The hashtags in its caption, in the caption's order
	@OneToMany(() => PostHashtag, link => link.post, { orderBy: { rank: 'asc' } })
	hashtagLinks = new Collection<PostHashtag>(this);

	// Every source that found it (`PostSource`), first find first
	@OneToMany(() => PostSource, find => find.post, { orderBy: { foundAt: 'asc', id: 'asc' } })
	foundBy = new Collection<PostSource>(this);

	// Every read of its counts (`SocialPostSnapshot`), oldest first
	@OneToMany(() => SocialPostSnapshot, snapshot => snapshot.post, { orderBy: { at: 'asc' } })
	snapshots = new Collection<SocialPostSnapshot>(this);
}
