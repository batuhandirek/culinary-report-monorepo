import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import type { VenueTopicSource } from '../util/venue-topics.js';

import { Topic } from './topic.entity.js';

/**
 * A venue's food topic. Two kinds of row, one writer (`VenueTopicService`):
 * - an admin's (`computed` false): a tag ("this one is vegan too") or, with `excluded`, "not
 *   Asian", which keeps off a tag its categories or posts would give;
 * - a computed tag (`computed` true): what `venueTopics` works out from its Google categories,
 *   posts by others, delivery menu, review tags and the admin's rows, with its `source`, `score`
 *   and the one `primary`. Replaced as a whole by `refresh`; readers read these (`tags()`).
 */
@Entity({ tableName: 'venue_topics' })
@Unique({ properties: ['venue', 'topic', 'computed'] })
@Index({ properties: ['topic', 'computed', 'primary'] })
export class VenueTopic extends MikroOrmSimpleEntityAbstractClass<'excluded' | 'computed' | 'primary'> {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade', index: true })
	venue: Rel<Venue>;

	@ManyToOne({ entity: () => Topic, deleteRule: 'cascade' })
	topic: Rel<Topic>;

	/** An admin's exclusion (an admin's row only) */
	@Property({ type: 'boolean', default: false })
	excluded: boolean = false;

	/** A computed tag, not an admin's row */
	@Property({ type: 'boolean', default: false })
	computed: boolean = false;

	/** A computed tag's source; `manual` is an admin's tag carried into the computed set */
	@Property({ type: 'text', nullable: true })
	source?: VenueTopicSource | null;

	@Property({ type: 'double', nullable: true })
	score?: number | null;

	/** The one kind of food it is known for (a computed tag only) */
	@Property({ type: 'boolean', default: false })
	primary: boolean = false;
}
