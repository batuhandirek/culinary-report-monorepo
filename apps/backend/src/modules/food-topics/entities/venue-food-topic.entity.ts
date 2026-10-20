import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { FoodTopic } from './food-topic.entity.js';

/**
 * An admin's food topic on a venue: "this one is vegan too", or with `excluded` "not Asian",
 * which keeps a tag its categories or posts would give off. The rest of a venue's tags are
 * worked out on read (`VenueFoodTopicService.tags`), so only these are stored. Written by
 * `VenueFoodTopicService` only; one row per venue and topic.
 */
@Entity({ tableName: 'venue_food_topics' })
@Unique({ properties: ['venue', 'topic'] })
export class VenueFoodTopic extends MikroOrmSimpleEntityAbstractClass<'excluded'> {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade', index: true })
	venue: Rel<Venue>;

	@ManyToOne({ entity: () => FoodTopic, deleteRule: 'cascade' })
	topic: Rel<FoodTopic>;

	@Property({ type: 'boolean', default: false })
	excluded: boolean = false;
}
