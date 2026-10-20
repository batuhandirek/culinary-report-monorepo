import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnPersistentEvent } from 'src/modules/pgboss/decorators/on-persistent-event.decorator.js';
import {
	ReportBuiltEvent,
	ReportBuiltEventPayload,
} from 'src/modules/reports/persisted-events/report-built.persisted-event.js';

import { ReportDeliveryService } from '../services/report-delivery.service.js';

/** Mails a freshly built report to a venue that subscribed. */
@Injectable()
export class ReportBuiltWorker {
	constructor(
		// `@EnsureRequestContext` looks it up on the instance
		private readonly orm: MikroORM,
		private readonly reportDeliveryService: ReportDeliveryService,
	) {}

	@OnPersistentEvent(ReportBuiltEvent.eventName, { retryLimit: 3 })
	@EnsureRequestContext()
	async onReportBuilt(job: JobWithMetadata<ReportBuiltEventPayload>) {
		await this.reportDeliveryService.deliverBuilt(job.data.reportId);
	}
}
