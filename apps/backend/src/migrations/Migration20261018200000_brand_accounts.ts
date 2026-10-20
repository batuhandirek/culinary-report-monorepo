import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (not generated): own accounts move from venues to brands, keeping the dev data. The generator would
 * drop and recreate the tables and lose the snapshots; this renames them and keys each account
 * by its venue's brand (brand-wide, `branch_id` null). Two branches' rows of one handle become
 * one account: the oldest stays, the others' snapshots move to it (a month it has already wins).
 */
export class Migration20261018200000_brand_accounts extends Migration {
	override async up(): Promise<void> {
		const sql = (q: string) => this.execute(q);

		await sql(`alter type "venue_account_platform" rename to "account_platform";`);
		await sql(`alter type "venue_account_source" rename to "account_source";`);
		await sql(`alter table "venue_accounts" rename to "brand_accounts";`);
		await sql(`alter table "venue_account_snapshots" rename to "brand_account_snapshots";`);
		await sql(`alter table "brand_accounts" rename constraint "venue_accounts_pkey" to "brand_accounts_pkey";`);
		await sql(`alter table "brand_account_snapshots" rename constraint "venue_account_snapshots_pkey" to "brand_account_snapshots_pkey";`);
		await sql(`alter table "brand_account_snapshots" rename constraint "venue_account_snapshots_account_id_month_unique" to "brand_account_snapshots_account_id_month_unique";`);
		await sql(`alter table "brand_account_snapshots" rename constraint "venue_account_snapshots_account_id_foreign" to "brand_account_snapshots_account_id_foreign";`);

		await sql(`alter table "brand_accounts" add column "brand_id" uuid null, add column "branch_id" uuid null;`);
		await sql(`update "brand_accounts" a set "brand_id" = v."brand_id" from "venues" v where v."id" = a."venue_id";`);

		// One account per brand, platform and handle: the oldest keeps the others' snapshots
		await sql(`create temporary table "account_keep" on commit drop as
			select a."id", (
				select k."id" from "brand_accounts" k
				where k."brand_id" = a."brand_id" and k."platform" = a."platform" and k."handle" = a."handle"
				order by k."created_at", k."id" limit 1
			) as "keep_id"
			from "brand_accounts" a;`);
		await sql(`delete from "brand_account_snapshots" s using "account_keep" m
			where m."id" = s."account_id" and m."keep_id" <> m."id"
				and exists (select 1 from "brand_account_snapshots" k where k."account_id" = m."keep_id" and k."month" = s."month");`);
		await sql(`update "brand_account_snapshots" s set "account_id" = m."keep_id" from "account_keep" m
			where m."id" = s."account_id" and m."keep_id" <> m."id";`);
		await sql(`delete from "brand_accounts" a using "account_keep" m where m."id" = a."id" and m."keep_id" <> m."id";`);

		await sql(`alter table "brand_accounts" drop constraint "venue_accounts_venue_id_platform_handle_unique";`);
		await sql(`alter table "brand_accounts" drop constraint "venue_accounts_venue_id_foreign";`);
		await sql(`alter table "brand_accounts" drop column "venue_id";`);
		await sql(`alter table "brand_accounts" alter column "brand_id" set not null;`);
		await sql(`alter table "brand_accounts" add constraint "brand_accounts_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);
		await sql(`alter table "brand_accounts" add constraint "brand_accounts_branch_id_foreign" foreign key ("branch_id") references "venues" ("id") on update cascade on delete set null;`);
		await sql(`create index "brand_accounts_brand_id_index" on "brand_accounts" ("brand_id");`);
		await sql(`create index "brand_accounts_branch_id_index" on "brand_accounts" ("branch_id");`);
		await sql(`alter table "brand_accounts" add constraint "brand_accounts_brand_id_platform_handle_unique" unique ("brand_id", "platform", "handle");`);
	}

	override down(): void {
		throw new Error('brand_accounts merges rows and cannot be undone: restore a backup instead');
	}
}
