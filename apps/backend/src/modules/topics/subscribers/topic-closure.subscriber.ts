import type { EventSubscriber, FlushEventArgs } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';

import { Topic } from '../entities/topic.entity.js';
import { TopicEdge } from '../entities/topic-edge.entity.js';
import { rebuildTopicClosure } from '../util/topic-closure.js';

/**
 * Keeps `topic_closure` equal to the topics and their edges: any flush that created, changed or
 * deleted a `Topic` or a `TopicEdge` rebuilds it, on the same entity manager, so inside the
 * writer's transaction when it has one. Raw SQL that touches either table calls
 * `TopicService.rebuildClosure` itself.
 */
export class TopicClosureSubscriber implements EventSubscriber {
	async afterFlush({ em, uow }: FlushEventArgs): Promise<void> {
		const touched = uow
			.getChangeSets()
			.some(cs => cs.entity instanceof Topic || cs.entity instanceof TopicEdge);
		if (!touched) return;
		const sql = em as EntityManager;
		await rebuildTopicClosure(text =>
			sql.getConnection().execute(text, [], 'run', sql.getTransactionContext()),
		);
	}
}
