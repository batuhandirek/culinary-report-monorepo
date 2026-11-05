import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (not generated): the user paused the one-off review backfill
 * (`reviews-talked-2026-11`) on 2026-11-05 with $38 of Apify credit left until the cycle ends on
 * 17 November. Migrations run at boot before `PipelineRecoveryService`, so a run still RUNNING (or
 * queued, or waiting) is failed here and not resumed; its venues fetched so far keep their reviews
 * and their stretch from 2026-05-01. Restarted by hand from the Data page (`BACKFILL_REVIEWS`,
 * since 2026-05-01, talked days 90): a new run skips every venue already fetched.
 */
export class Migration20261105120000_pause_review_backfill extends Migration {
	override up(): void | Promise<void> {
		this.addSql(
			`update "pipeline_runs" set "status" = 'FAILED', "finished_at" = now(),
			"error" = 'Paused by the user on 2026-11-05: Apify credit runs out before the cycle ends on 17 November. Start BACKFILL_REVIEWS again from the Data page (since 2026-05-01); venues already fetched are skipped.'
			where "step" = 'BACKFILL_REVIEWS' and "status" in ('QUEUED', 'RUNNING', 'WAITING');`,
		);
	}

	override down(): void | Promise<void> {
		// A paused run is restarted by hand, not by undoing this
	}
}
