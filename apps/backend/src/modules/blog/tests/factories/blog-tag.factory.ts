import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { getEntityManager } from 'src/shared/util/em.js';
import { slug as slugify } from 'src/shared/util/string.js';

import { BlogTag } from '../../entities/blog-tag.entity.js';

export const blogTagFactory = Factory.define<BlogTag>(({ params, associations, onCreate }) => {
	onCreate(async (tag: BlogTag) => {
		await getEntityManager().flush();
		return tag;
	});

	const name = (params.name as string) ?? faker.lorem.word();

	return getEntityManager().create(BlogTag, {
		name,
		slug: params.slug ?? `${slugify(name)}-${faker.string.alphanumeric(5)}`,
		createdAt: new Date(),
		updatedAt: new Date(),
		...params,
		...associations,
	} as BlogTag);
});
