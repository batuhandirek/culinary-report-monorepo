import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialPost } from './social-post.entity.js';

/**
 * A post's counts as one read gave them: a scrape that found it (new or again) or the refresh at
 * its fixed age. Written with every read (`SocialPostService.readCounts`), also after the post's
 * own counts are final, so how a post grew is kept.
 */
@Entity({ tableName: 'social_post_snapshots' })
@Index({ properties: ['post', 'at'] })
export class SocialPostSnapshot extends MikroOrmEntityAbstractClass<'views' | 'likes' | 'shares' | 'comments' | 'saves'> {
	@ManyToOne({ entity: () => SocialPost, deleteRule: 'cascade' })
	post: Rel<SocialPost>;

	// When the counts were read
	@Property({ type: 'datetime' })
	at: Date;

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
}
