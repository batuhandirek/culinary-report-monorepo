import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

/**
 * One hashtag, across platforms and cities: `tag` lowercase without `#` (`normalizeHashtag`), so
 * #BerlinFood and #berlinfood are one row. Posts carry it through `PostHashtag`, a city's hashtag
 * source through `CitySource.hashtag`. `HashtagService` is the one writer of its links.
 */
@Entity({ tableName: 'hashtags' })
export class Hashtag extends MikroOrmSimpleEntityAbstractClass<'ignored'> {
	@Property({ type: 'text', unique: true })
	tag: string;

	// The food topic it names as a whole (#smashburger: burgers), re-linked by `TopicRelinkJob`
	@ManyToOne({ entity: () => Topic, nullable: true, deleteRule: 'set null', index: true })
	topic?: Rel<Topic> | null;

	// The one brand whose name or own account handle it is (#burgerbros), re-checked on brand changes
	@ManyToOne({ entity: () => Brand, nullable: true, deleteRule: 'set null', index: true })
	brand?: Rel<Brand> | null;

	// Noise an admin dismissed (#fyp, #viral): never suggested as a source
	@Property({ type: 'boolean', default: false })
	ignored: boolean = false;
}
