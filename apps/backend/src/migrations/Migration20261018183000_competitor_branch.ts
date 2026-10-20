import { Migration } from '@mikro-orm/migrations';

// Written by hand (the generator needs a full build): a competitor may be for one of the
// brand's branches (`brand_competitors.branch_id`), null for the whole brand.
export class Migration20261018183000_competitor_branch extends Migration {
	override up(): void {
		this.addSql(`alter table "brand_competitors" add column "branch_id" uuid null;`);
		this.addSql(`alter table "brand_competitors" add constraint "brand_competitors_branch_id_foreign" foreign key ("branch_id") references "venues" ("id") on update cascade on delete cascade;`);
		this.addSql(`create index "brand_competitors_branch_id_index" on "brand_competitors" ("branch_id");`);
	}

	override down(): void {
		this.addSql(`alter table "brand_competitors" drop constraint "brand_competitors_branch_id_foreign";`);
		this.addSql(`drop index "brand_competitors_branch_id_index";`);
		this.addSql(`alter table "brand_competitors" drop column "branch_id";`);
	}
}
