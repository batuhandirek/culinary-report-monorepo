import { Migration } from '@mikro-orm/migrations';

/**
 * Hand-written data migration: the seed's topic aliases (`Migration20261018101737_food_topics`,
 * carried as admin terms by `Migration20261030130000_terms`) were typed in before link strengths
 * existed, all `same`, some wrong ("steak" → Steakhouse, "coffee" → Café). Every admin term with a
 * link is reopened for agent C (the `terms` backlog); its links stay until the new answer replaces
 * them. Admin terms with no link (dismissed words) are untouched. On 2026-11-01 nothing else had
 * made an admin link, so this reaches the seed's only.
 */
export class Migration20261101100000_reopen_seed_aliases extends Migration {
	override up(): void {
		this.addSql(
			`update "terms" t set "decided_by" = null, "decided_at" = null
			where t."decided_by" = 'admin' and exists (select 1 from "term_topics" tt where tt."term_id" = t."id");`,
		);
	}

	override down(): void {
		// Nothing to undo: the agent decides them again either way
	}
}
