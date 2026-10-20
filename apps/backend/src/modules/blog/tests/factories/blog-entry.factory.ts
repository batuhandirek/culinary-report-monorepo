import { faker } from '@faker-js/faker';
import { deriveBlogContent } from 'blog-content';
import { Factory } from 'fishery';

import { getEntityManager } from 'src/shared/util/em.js';
import { slug as slugify } from 'src/shared/util/string.js';

// Build a minimal TipTap JSON document wrapping a single paragraph of text.
const docFromText = (text: string) =>
	JSON.stringify({
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
	});

import { BlogEntryStateEnum } from '../../constants/blog-entry-state.enum.constant.js';
import { BlogEntry } from '../../entities/blog-entry.entity.js';

class BlogEntryFactory extends Factory<BlogEntry> {
	published() {
		return this.params({ state: BlogEntryStateEnum.PUBLISHED, publishedAt: new Date() });
	}

	draft() {
		return this.params({ state: BlogEntryStateEnum.DRAFT, publishedAt: null });
	}
}

export const blogEntryFactory = BlogEntryFactory.define(({ params, associations, onCreate }) => {
	onCreate(async (entry: BlogEntry) => {
		await getEntityManager().flush();
		return entry;
	});

	const title = (params.title as string) ?? faker.lorem.sentence();
	// Content is stringified TipTap JSON; derive the html/text projections the service normally
	// generates on save so factory-built entries look like real ones.
	const content = (params.content as string) ?? docFromText(faker.lorem.paragraph());
	const { html, text } = deriveBlogContent(content);

	return getEntityManager().create(BlogEntry, {
		title,
		slug: params.slug ?? `${slugify(title)}-${faker.string.alphanumeric(5)}`,
		content,
		contentHtml: html,
		contentText: text,
		excerpt: faker.lorem.sentence(),
		state: BlogEntryStateEnum.DRAFT,
		viewCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		...params,
		...associations,
	} as BlogEntry);
});
