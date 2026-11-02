import { Migration } from '@mikro-orm/migrations';

/**
 * Hand-written data migration: the term links stored before relations (2026-10-31) get one. A name
 * match's and an admin's are `same` (the column's default); agent C's are `kind_of` until C is asked
 * again with relations (the first pass answered topics only, compounds included), so a strict
 * reader never counts an unchecked agent link as the same thing.
 */
export class Migration20261031192000_term_relations_backfill extends Migration {
	override up(): void {
		this.addSql(
			`update "term_topics" tt set "relation" = 'kind_of' from "terms" t where t.id = tt.term_id and t.decided_by = 'ai';`,
		);
	}

	override down(): void {
		this.addSql(`update "term_topics" set "relation" = 'same';`);
	}
}
