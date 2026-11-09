import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { ASPECT_DISCOVERY_CRON } from '../constants/aspect-discovery.constant.js';
import {
	AspectDiscoveryWorkflow,
	startAspectDiscovery,
} from '../workflows/aspect-discovery.workflow.js';

/** Weekly (`ASPECT_DISCOVERY_CRON`): aspect discovery over the cron cities, one run in flight */
@Injectable()
export class AspectDiscoverySchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly workflow: AspectDiscoveryWorkflow,
	) {}

	@DurableSchedule('aspect-discovery', ASPECT_DISCOVERY_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		await startAspectDiscovery(this.durable, this.workflow, { dryRun: false, cronOnly: true });
	}
}
