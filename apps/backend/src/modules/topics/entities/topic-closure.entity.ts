import { PrimaryKeyProp, type Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { Topic } from './topic.entity.js';

/**
 * Derived, never edited: every topic with each topic it counts for through its edges, itself at
 * depth 0 (`topic_closure`). `hasEdge` is false when a path of `is_a` edges alone reaches the
 * ancestor, true when every path crosses a `has` edge: strict counting reads `has_edge = false`.
 * Rebuilt whole from `topic_edges` whenever a topic or an edge changes (`rebuildTopicClosure`).
 */
@Entity({ tableName: 'topic_closure' })
@Index({ properties: ['ancestor'] })
export class TopicClosure {
	[PrimaryKeyProp]?: ['topic', 'ancestor'];

	@ManyToOne({ entity: () => Topic, primary: true, deleteRule: 'cascade' })
	topic: Rel<Topic>;

	@ManyToOne({ entity: () => Topic, primary: true, deleteRule: 'cascade' })
	ancestor: Rel<Topic>;

	@Property({ type: 'int' })
	depth: number;

	@Property({ type: 'boolean' })
	hasEdge: boolean;
}
