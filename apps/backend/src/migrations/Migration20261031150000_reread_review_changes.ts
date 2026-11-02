import { Migration } from '@mikro-orm/migrations';

/**
 * Hand-written data migration: the review claims flagged as a change are read again by agent B
 * (the `statement-parts` backlog), now told one rule (`CHANGE_RULE`) and final on the flag. Measured
 * on dev Berlin (2026-10-31): a third to two thirds of the flags were consistency ("delicious as
 * always"), another branch, an opening or a wish. Posts' claims are written anew by the re-read.
 */
export class Migration20261031150000_reread_review_changes extends Migration {
	override up(): void {
		this.addSql(`update "statements" set "parts_at" = null where "change" and "source_kind" = 'review';`);
	}

	override down(): void {
		// Nothing to undo: agent B reads them again either way
	}
}
