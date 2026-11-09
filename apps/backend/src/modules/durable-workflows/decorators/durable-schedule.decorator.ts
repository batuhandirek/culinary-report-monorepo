import { SetMetadata } from '@nestjs/common';

import { DURABLE_SCHEDULE_OPTIONS } from '../constants/durable-workflows.constant.js';
import type {
	DurableScheduleMetadata,
	DurableScheduleOptions,
} from '../interfaces/durable-workflows.interface.js';

/**
 * The method is a workflow DBOS starts on a cron (`(scheduledAt: Date) => Promise<void>`), the
 * durable `@OnCron`: the schedule is written to the database at boot under `name`, changed when
 * the cron changes, and removed when the decorator goes. Every firing is one workflow, so the
 * admin's workflow list shows each run and its steps. Not applied while `INGESTION_IS_DISABLED`.
 */
export function DurableSchedule(name: string, cron: string, options: DurableScheduleOptions = {}) {
	const metadata: DurableScheduleMetadata = { ...options, name, cron };
	return (target: object, key: string, descriptor: PropertyDescriptor) => {
		SetMetadata(DURABLE_SCHEDULE_OPTIONS, metadata)(target, key, descriptor);
	};
}
