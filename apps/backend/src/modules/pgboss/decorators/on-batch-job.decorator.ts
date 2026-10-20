import { SetMetadata } from '@nestjs/common';

import { BatchJobHandlerOptions } from '../interfaces/job-handler-options.type.js';

export const ON_BATCH_JOB_QUEUE = 'PGBOSS_ON_BATCH_JOB_QUEUE';
export const ON_BATCH_JOB_OPTIONS = 'PGBOSS_ON_BATCH_JOB_OPTIONS';

/** Batch job handler. Receives an array of jobs. Requires batchSize to be set. */
export function OnBatchJob(queueName: string, options: BatchJobHandlerOptions) {
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(ON_BATCH_JOB_QUEUE, queueName)(target, key, descriptor);
		SetMetadata(ON_BATCH_JOB_OPTIONS, options)(target, key, descriptor);
	};
}
