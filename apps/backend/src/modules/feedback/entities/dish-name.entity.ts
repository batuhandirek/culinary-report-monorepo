import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

/**
 * Who decided a dish name's topic: the name is the topic or one of its other names (`match`, free),
 * the `feedback-dish-names` backlog's agent (`ai`), or an admin (`admin`, never changed by anything else).
 */
export type DishNameDecider = 'match' | 'ai' | 'admin';

/**
 * One dish or drink name the feedback rows carry, across spellings (`key` = `dishKey`, the rows'
 * `dishKey`), and the food topic it is a kind of: "vegan döner" and "Dürüm" are kebab,
 * "Spaghettiiiossso" pasta. A row's `foodTopic` is its name's (`DishNameService.apply`). Decided
 * once: by a name match when the name is a dish or drink topic as a whole, else by the agent, which
 * suggests a topic when none fits ("Fries"); undecided (`decidedBy` null) waits for the backlog.
 * `DishNameService` is the one writer.
 */
@Entity({ tableName: 'dish_names' })
export class DishName extends MikroOrmSimpleEntityAbstractClass {
	@Property({ type: 'text', unique: true })
	key: string;

	/** The spelling the rows use most, when the name was first seen: what the agent and the admin read */
	@Property({ type: 'text' })
	name: string;

	/** A dish or drink topic; null for none (decided) or not decided yet */
	@ManyToOne({ entity: () => FoodTopic, nullable: true, deleteRule: 'set null', index: true })
	foodTopic?: Rel<FoodTopic> | null;

	@Property({ type: 'text', nullable: true })
	decidedBy?: DishNameDecider | null;

	@Property({ type: 'datetime', nullable: true })
	decidedAt?: Date | null;

	/** The agent's label for a topic that would fit, when none does ("Fries", "Hummus"); null when the name is too general ("sauce") */
	@Property({ type: 'text', nullable: true })
	suggestion?: string | null;
}
