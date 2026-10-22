import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { Creator } from './creator.entity.js';
import { SocialAccountSnapshot } from './social-account-snapshot.entity.js';
import { SocialPlatformEnum, SocialPost } from './social-post.entity.js';

/** How we know an account is a brand's own. */
export enum AccountBrandSourceEnum {
	// The matcher: the handle is the brand's (or a branch's) name (`matchAccount`)
	HANDLE = 'handle',
	// A branch's Google website is this profile
	WEBSITE = 'website',
	// Outreach's handle for the brand (`Prospect.instagram`)
	PROSPECT = 'prospect',
	// An admin linked it, or confirmed the matcher's suggestion
	ADMIN = 'admin',
}

/**
 * One handle on one platform: the author of posts, keyed by platform and handle (lowercase, no
 * @). It belongs to a `Creator`, and may be a brand's own account (`brand`, a branch's own when
 * `branch` is set), which is what "posts by others" leaves out everywhere. The link is stored once
 * by `AccountMatchingService` (or an admin) and read by every count; `rejectedBrandIds` holds the
 * brands an admin said it is not, final for the matcher.
 */
@Entity({ tableName: 'social_accounts' })
@Unique({ properties: ['platform', 'handle'] })
export class SocialAccount extends MikroOrmEntityAbstractClass<
	'rejectedBrandIds' | 'posts' | 'snapshots' | 'creator'
> {
	@Enum({ items: () => SocialPlatformEnum, nativeEnumName: 'social_platform' })
	platform: SocialPlatformEnum;

	// Lowercase, without the @
	@Property({ type: 'text' })
	handle: string;

	// The name the profile shows ("SORI Ramen Berlin"), when an item carried it
	@Property({ type: 'text', nullable: true })
	displayName?: string | null;

	// The latest follower count an item or a profile scrape gave
	@Property({ type: 'int', nullable: true })
	followers?: number | null;

	@Property({ type: 'datetime', nullable: true })
	followersAt?: Date | null;

	// The city whose scrape found it first: its venues are the ones it is matched against
	@ManyToOne({ entity: () => City, index: true })
	city: Rel<City>;

	// A new account without one gets a creator of its own (`SocialAccountSubscriber`)
	@ManyToOne({ entity: () => Creator, index: true })
	creator: Rel<Creator>;

	// The brand whose own account it is
	@ManyToOne({ entity: () => Brand, nullable: true, index: true, deleteRule: 'set null' })
	brand?: Rel<Brand> | null;

	// A branch's own account (the brand set too): counted in that branch's city only
	@ManyToOne({ entity: () => Venue, nullable: true, deleteRule: 'set null' })
	branch?: Rel<Venue> | null;

	@Enum({
		items: () => AccountBrandSourceEnum,
		nativeEnumName: 'account_brand_source',
		nullable: true,
	})
	brandSource?: AccountBrandSourceEnum | null;

	// The matcher's likely brand, for an admin to confirm or reject; null once decided
	@ManyToOne({ entity: () => Brand, nullable: true, index: true, deleteRule: 'set null' })
	suggestedBrand?: Rel<Brand> | null;

	// How close the handle is to the suggested brand's name, 0–1
	@Property({ type: 'float', nullable: true })
	suggestedScore?: number | null;

	// Brands an admin said it is not: never linked to or suggested again
	@Property({ type: 'jsonb', default: '[]' })
	rejectedBrandIds: string[] = [];

	@OneToMany(() => SocialPost, post => post.account)
	posts = new Collection<SocialPost>(this);

	@OneToMany(() => SocialAccountSnapshot, snapshot => snapshot.account)
	snapshots = new Collection<SocialAccountSnapshot>(this);
}
