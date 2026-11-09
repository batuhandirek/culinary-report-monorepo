import { SetMetadata } from '@nestjs/common';

import { DURABLE_WORKFLOW_OPTIONS } from '../constants/durable-workflows.constant.js';
import type { DurableWorkflowOptions } from '../interfaces/durable-workflows.interface.js';

/**
 * The method runs as a durable workflow: every `DurableWorkflowsService.step` (or `@DurableStep`
 * method) it awaits is checkpointed in Postgres, so a restart resumes it after the last finished
 * step instead of starting over, and `sleep` / `recv` survive deploys. Called from outside a
 * workflow it starts one and awaits its result; from inside, it is a child workflow. To run it in
 * the background or on a queue: `DurableWorkflowsService.start`.
 *
 * The method's arguments and result are stored, so keep them small and serializable (ids, not
 * entities). Put the decorator above `@EnsureRequestContext()`, as `@OnJob` is.
 */
export function DurableWorkflow(options: DurableWorkflowOptions = {}) {
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(DURABLE_WORKFLOW_OPTIONS, options)(target, key, descriptor);
	};
}
