import { Migration } from '@mikro-orm/migrations';

/**
 * Hand-written data migration: every wording agent C decided is asked again (the `terms` backlog),
 * now answering a relation per topic (same, kind_of, with), offered ingredients, and told to link
 * compounds to every topic they are ("vegan döner" → kebab and Vegan) and to answer none for
 * generic words. Links stay until the new answer replaces them; a name match's and an admin's
 * decisions are untouched. Folds in the task `reask-terms-for-compound-links`.
 */
export class Migration20261031193000_reask_agent_terms extends Migration {
	override up(): void {
		this.addSql(`update "terms" set "decided_by" = null, "decided_at" = null where "decided_by" = 'ai';`);
	}

	override down(): void {
		// Nothing to undo: the agent decides them again either way
	}
}
