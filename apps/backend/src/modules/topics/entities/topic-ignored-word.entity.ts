import { Entity, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

/**
 * A cuisine word an admin said is no kind of food to map ("supermarket", "takeout", "fusion"):
 * the unrecognised words list leaves it out. A `normalizeCuisine` key, in every city. It changes
 * nothing else: an ignored word resolves to no topic, as before. Written by `TopicService`.
 */
@Entity({ tableName: 'topic_ignored_words' })
export class TopicIgnoredWord extends MikroOrmSimpleEntityAbstractClass {
	@Property({ type: 'text', unique: true })
	key: string;
}
