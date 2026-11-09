import type { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { READ_POSTS_CITY_QUEUE } from '../queues/read-posts.queue.js';
import type { ReadCityResult, ReadPostsWorkflow } from '../workflows/read-posts.workflow.js';

/**
 * A city's unread posts read (`ReadPostsWorkflow.readCity`) on its queue, one run in flight per
 * city: a second caller gets the run already going (`onDuplicate: 'return-existing'`). Awaited by
 * default (a dependent operation's call, from its workflow's body, never inside a step); the
 * schedule only starts it.
 */
export const readCityNow = async (
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: Pick<ReadPostsWorkflow, 'readCity'>,
	cityId: string,
	opts: { await?: boolean } = {},
): Promise<ReadCityResult | undefined> => {
	const handle = await durable.start(workflow.readCity, [cityId], {
		queue: READ_POSTS_CITY_QUEUE,
		dedupe: cityId,
		onDuplicate: 'return-existing',
		attributes: { cityId, purpose: 'read-posts' },
	});
	return opts.await === false ? undefined : handle.getResult();
};
