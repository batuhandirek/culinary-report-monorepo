import { SetMetadata } from '@nestjs/common';

import { JobHandlerOptions } from '../interfaces/job-handler-options.type.js';

export const ON_JOB_QUEUE = 'PGBOSS_ON_JOB_QUEUE';
export const ON_JOB_OPTIONS = 'PGBOSS_ON_JOB_OPTIONS';

/** Single-consumer job handler. Receives a single unwrapped job. */
export function OnJob(queueName: string, options: JobHandlerOptions = {}) {
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(ON_JOB_QUEUE, queueName)(target, key, descriptor);
		SetMetadata(ON_JOB_OPTIONS, options)(target, key, descriptor);
	};
}
