import { SetMetadata } from '@nestjs/common';

import { JobHandlerOptions } from '../interfaces/job-handler-options.type.js';

export const ON_PERSISTENT_EVENT_NAME = 'PGBOSS_ON_PERSISTENT_EVENT_NAME';
export const ON_PERSISTENT_EVENT_OPTIONS = 'PGBOSS_ON_PERSISTENT_EVENT_OPTIONS';

/** Fan-out event handler. Receives a single unwrapped job. */
export function OnPersistentEvent(eventName: string, options: JobHandlerOptions = {}) {
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(ON_PERSISTENT_EVENT_NAME, eventName)(target, key, descriptor);
		SetMetadata(ON_PERSISTENT_EVENT_OPTIONS, options)(target, key, descriptor);
	};
}
