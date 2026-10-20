import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToMany, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { Image } from 'src/modules/image/entities/image.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { BlogEntryStateEnum } from '../constants/blog-entry-state.enum.constant.js';
import { BlogEntryRepository } from '../repositories/blog-entry.repository.js';

import { BlogTag } from './blog-tag.entity.js';

@Entity({
	tableName: 'blog_entries',
	repository: () => BlogEntryRepository,
})
@Index({ properties: ['state', 'publishedAt'] })
export class BlogEntry extends MikroOrmEntityAbstractClass<'viewCount'> {
	@Property({ type: 'text' })
	title: string;

	// SEO-friendly identifier; the public routes can resolve entries by slug or id.
	@Property({ type: 'text', unique: true })
	slug: string;

	// Short summary used for cards, meta description and OG image.
	@Property({ type: 'text', nullable: true })
	excerpt?: string | null;

	// Article body as a stringified TipTap/ProseMirror JSON document (the edit source of truth,
	// authored via the admin WYSIWYG editor).
	@Property({ type: 'text' })
	content: string;

	// Rendered HTML, regenerated from `content` on every save (public pages render this via
	// `{@html}`; the editor never reads it).
	@Property({ type: 'text', default: '' })
	contentHtml: string = '';

	// Plain-text projection of `content`, regenerated on every save so full-text `q` search can
	// match the article body (not just the title).
	@Property({ type: 'text', default: '' })
	contentText: string = '';

	@Enum(() => BlogEntryStateEnum)
	state: BlogEntryStateEnum;

	@Property({ type: 'datetime', nullable: true })
	publishedAt?: Date | null;

	@Property({ type: 'int', default: 0 })
	viewCount: number = 0;

	@ManyToOne({
		entity: () => User,
		nullable: true,
		deleteRule: 'set null',
	})
	author?: Rel<User>;

	@ManyToOne({
		entity: () => Image,
		nullable: true,
		deleteRule: 'set null',
	})
	coverImage?: Rel<Image>;

	@ManyToMany({ entity: () => BlogTag, owner: true })
	tags = new Collection<BlogTag>(this);
}
