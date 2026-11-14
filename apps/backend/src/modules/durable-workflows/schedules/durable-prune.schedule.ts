import { Injectable, Logger } from '@nestjs/common';

import {
	DURABLE_PRUNE_BATCH,
	DURABLE_PRUNE_CRON,
	DURABLE_PRUNE_MAX_BATCHES,
	DURABLE_WORKFLOWS_LOGGER,
	ITEM_RUN_KEEP_DAYS,
} from '../constants/durable-workflows.constant.js';
import { DurableSchedule } from '../decorators/durable-schedule.decorator.js';
import {
	DurablePruneService,
	type PruneBatch,
	type PruneCursor,
} from '../services/durable-prune.service.js';
import { DurableRegistry } from '../services/durable-registry.service.js';
import { DurableWorkflowsService } from '../services/durable-workflows.service.js';
import { durableNow } from '../util/durable-steps.js';

/**
 * Daily: deletes the finished runs of every workflow that declares `keepDays` once they are past
 * it (`DurablePruneService`), so DBOS keeps days of item runs (agent calls, readings) instead of
 * every one ever made. Each batch is one step that looks at `DURABLE_PRUNE_BATCH` runs and returns
 * counts only, so the prune adds next to nothing to DBOS itself. Its own firings are kept as long.
 */
@Injectable()
export class DurablePruneSchedule {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);

	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly registry: DurableRegistry,
		private readonly pruneService: DurablePruneService,
	) {}

	@DurableSchedule('durable-prune', DURABLE_PRUNE_CRON, { keepDays: ITEM_RUN_KEEP_DAYS })
	async prune(): Promise<{ looked: number; deleted: number; batches: number }> {
		const now = (await durableNow(this.durable)).getTime();
		const rules = await this.durable.step('rules', async () => this.registry.prunable());
		let after: PruneCursor | null = null;
		let looked = 0;
		let deleted = 0;
		let batches = 0;
		while (batches < DURABLE_PRUNE_MAX_BATCHES) {
			const cursor: PruneCursor | null = after;
			const batch: PruneBatch = await this.durable.step('prune batch', () =>
				this.pruneService.batch(rules, now, cursor, DURABLE_PRUNE_BATCH),
			);
			batches++;
			looked += batch.looked;
			deleted += batch.deleted;
			if (!batch.next) break;
			after = batch.next;
		}
		this.logger.log(
			`Prune: ${deleted} of ${looked} finished run(s) past their keepDays deleted, ${batches} batch(es)`,
		);
		return { looked, deleted, batches };
	}
}
