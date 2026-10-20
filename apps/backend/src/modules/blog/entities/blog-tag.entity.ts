import { Collection } from '@mikro-orm/core';
import { Entity, ManyToMany, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { BlogTagRepository } from '../repositories/blog-tag.repository.js';

import { BlogEntry } from './blog-entry.entity.js';

@Entity({
	tableName: 'blog_tags',
	repository: () => BlogTagRepository,
})
export class BlogTag extends MikroOrmEntityAbstractClass {
	@Property({ type: 'text' })
	name: string;

	@Property({ type: 'text', unique: true })
	slug: string;

	@ManyToMany({ entity: () => BlogEntry, mappedBy: 'tags' })
	entries = new Collection<BlogEntry>(this);
}
