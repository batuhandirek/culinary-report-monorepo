import { SetMetadata } from '@nestjs/common';

import { DURABLE_STEP_OPTIONS } from '../constants/durable-workflows.constant.js';
import type { DurableStepOptions } from '../interfaces/durable-workflows.interface.js';

/**
 * The method is a step: called inside a workflow its result is checkpointed and never run again
 * on a resume; called outside one it is a plain method. For a one-off step inside a workflow,
 * `DurableWorkflowsService.step(name, fn)` does the same without a decorator.
 */
export function DurableStep(options: DurableStepOptions = {}) {
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(DURABLE_STEP_OPTIONS, options)(target, key, descriptor);
	};
}
