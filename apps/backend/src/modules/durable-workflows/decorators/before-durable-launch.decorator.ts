import { SetMetadata } from '@nestjs/common';

import { DURABLE_BEFORE_LAUNCH } from '../constants/durable-workflows.constant.js';

/**
 * The method runs once at boot, after every provider is built and before DBOS launches, so
 * before it recovers the runs a restart cut short and before any queue hands out work: the
 * moment to rewrite where live runs wait (`DurableWorkflowsService.moveRuns`). It takes no
 * arguments; an error is logged and the boot goes on. The facade's DBOS calls (`start`, `list`)
 * don't work yet here.
 */
export function BeforeDurableLaunch() {
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(DURABLE_BEFORE_LAUNCH, true)(target, key, descriptor);
	};
}
