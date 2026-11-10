import type { StartOptions } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';
import type { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { MATCH_MENTION_WORKFLOW } from '../constants/match-mentions.constant.js';
import { MATCH_MENTION_QUEUE } from '../queues/match-mentions.queue.js';

/**
 * How a close call (`match-mentions.mention`) is started, whoever starts it: on its own queue, one
 * run in flight per mention, a second start handed the run already there. A mention is matched
 * again later (new venues, a brand change), so the key holds only while a run is in flight.
 */
export const closeCallStart = (
	mentionId: number,
	cityId: string,
): StartOptions & { queue: typeof MATCH_MENTION_QUEUE } => ({
	queue: MATCH_MENTION_QUEUE,
	dedupe: `mention-${mentionId}`,
	onDuplicate: 'return-existing',
	attributes: { cityId, purpose: 'match-mentions' },
});

/**
 * A post's close calls queued from its reading's body (never inside a step), not awaited: each
 * waits for its agent call on its own, so the post's run ends and the reading goes on.
 */
export const queueCloseCalls = async (
	durable: Pick<DurableWorkflowsService, 'enqueue'>,
	mentionIds: number[],
	cityId: string,
): Promise<void> => {
	for (const mentionId of mentionIds)
		await durable.enqueue(MATCH_MENTION_WORKFLOW, [mentionId], closeCallStart(mentionId, cityId));
};
