import { Migration } from '@mikro-orm/migrations';

// Hand-written: a rename the generator would emit as a new enum value. The step reads every
// mentioned Instagram account now (tags and bios), not only the tagged ones; stored runs keep
// their rows.
export class Migration20261105170000_read_mentioned_profiles extends Migration {
	override up(): void {
		this.addSql(`alter type "pipeline_step" rename value 'READ_TAGGED_PROFILES' to 'READ_MENTIONED_PROFILES';`);
	}

	override down(): void {
		this.addSql(`alter type "pipeline_step" rename value 'READ_MENTIONED_PROFILES' to 'READ_TAGGED_PROFILES';`);
	}
}
