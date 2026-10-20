import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnPersistentEvent } from 'src/modules/pgboss/decorators/on-persistent-event.decorator.js';
import {
	ReviewAlertEvent,
	ReviewAlertEventPayload,
} from 'src/modules/venues/persisted-events/review-alert.persisted-event.js';

import { ReviewAlertService } from '../services/review-alert.service.js';

/** Mails a subscribed venue the critical review the weekly watch found. */
@Injectable()
export class ReviewAlertWorker {
	constructor(
		// `@EnsureRequestContext` looks it up on the instance
		private readonly orm: MikroORM,
		private readonly reviewAlertService: ReviewAlertService,
	) {}

	@OnPersistentEvent(ReviewAlertEvent.eventName, { retryLimit: 3 })
	@EnsureRequestContext()
	async onReviewAlert(job: JobWithMetadata<ReviewAlertEventPayload>) {
		await this.reviewAlertService.send(job.data.reviewId);
	}
}
