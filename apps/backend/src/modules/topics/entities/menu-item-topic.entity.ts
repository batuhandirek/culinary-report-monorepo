import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Unique } from '@mikro-orm/decorators/legacy';

import { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Topic } from './topic.entity.js';

/**
 * A kind of food a delivery menu item is (`TopicIndex.resolveMenuItem`: its name, else its
 * menu section; a side or a drink only a drink), stored with the item and re-linked by
 * `TopicRelinkJob`. Without parents. Written by `MenuTopicService` only.
 */
@Entity({ tableName: 'menu_item_topics' })
@Unique({ properties: ['menuItem', 'topic'] })
@Index({ properties: ['topic'] })
export class MenuItemTopic extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => MenuItem, deleteRule: 'cascade' })
	menuItem: Rel<MenuItem>;

	@ManyToOne({ entity: () => Topic, deleteRule: 'cascade' })
	topic: Rel<Topic>;
}
