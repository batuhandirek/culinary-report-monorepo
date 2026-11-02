import { Migration } from '@mikro-orm/migrations';

/**
 * Hand-written data migration: every stored report is deleted (the user, 2026-10-31: none was
 * sent anywhere, and they are rebuilt from stored data). Reports built before claim model v2 carry
 * a post's one-line `summary` instead of `said`; deleting them spares every reader a fallback.
 * Their share links go with them (cascade); outreach touches keep their log with the report link
 * cleared (set null).
 */
export class Migration20261031183000_drop_old_reports extends Migration {
	override up(): void {
		this.addSql(`delete from "reports";`);
	}

	override down(): void {
		// Nothing to restore: reports are rebuilt from stored data
	}
}
