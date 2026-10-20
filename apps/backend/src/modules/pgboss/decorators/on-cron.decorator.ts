import { SetMetadata } from '@nestjs/common';

import { CronHandlerOptions } from '../interfaces/job-handler-options.type.js';

export const ON_CRON_QUEUE = 'PGBOSS_ON_CRON_QUEUE';
export const ON_CRON_EXPRESSION = 'PGBOSS_ON_CRON_EXPRESSION';
export const ON_CRON_OPTIONS = 'PGBOSS_ON_CRON_OPTIONS';

export function OnCron(
	queueName: string,
	cronExpression: string,
	options: CronHandlerOptions = {},
) {
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(ON_CRON_QUEUE, queueName)(target, key, descriptor);
		SetMetadata(ON_CRON_EXPRESSION, cronExpression)(target, key, descriptor);
		SetMetadata(ON_CRON_OPTIONS, options)(target, key, descriptor);
	};
}
