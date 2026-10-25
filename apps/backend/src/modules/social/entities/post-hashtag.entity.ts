import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Hashtag } from './hashtag.entity.js';
import { SocialPost } from './social-post.entity.js';

/** A hashtag in a post's caption, in the caption's order (`rank`). Written with the post. */
@Entity({ tableName: 'post_hashtags' })
@Unique({ properties: ['post', 'hashtag'] })
@Index({ properties: ['hashtag'] })
export class PostHashtag extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => SocialPost, deleteRule: 'cascade' })
	post: Rel<SocialPost>;

	@ManyToOne({ entity: () => Hashtag, deleteRule: 'cascade' })
	hashtag: Rel<Hashtag>;

	@Property({ type: 'int' })
	rank: number;
}
