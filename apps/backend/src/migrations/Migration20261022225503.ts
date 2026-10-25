import { Migration } from '@mikro-orm/migrations';

export class Migration20261022225503 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "account_rejected_brands" ("id" serial primary key, "created_at" timestamptz not null default now(), "account_id" uuid not null, "brand_id" uuid not null);`);
    this.addSql(`create index "account_rejected_brands_brand_id_index" on "account_rejected_brands" ("brand_id");`);
    this.addSql(`alter table "account_rejected_brands" add constraint "account_rejected_brands_account_id_brand_id_unique" unique ("account_id", "brand_id");`);

    this.addSql(`create table "brand_excluded_venues" ("id" serial primary key, "created_at" timestamptz not null default now(), "brand_id" uuid not null, "venue_id" uuid not null);`);
    this.addSql(`create index "brand_excluded_venues_venue_id_index" on "brand_excluded_venues" ("venue_id");`);
    this.addSql(`alter table "brand_excluded_venues" add constraint "brand_excluded_venues_brand_id_venue_id_unique" unique ("brand_id", "venue_id");`);

    this.addSql(`alter table "account_rejected_brands" add constraint "account_rejected_brands_account_id_foreign" foreign key ("account_id") references "social_accounts" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "account_rejected_brands" add constraint "account_rejected_brands_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "brand_excluded_venues" add constraint "brand_excluded_venues_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "brand_excluded_venues" add constraint "brand_excluded_venues_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "brands" drop column "excluded_venue_ids";`);

    this.addSql(`alter table "apify_runs" add constraint "apify_runs_pipeline_run_id_foreign" foreign key ("pipeline_run_id") references "pipeline_runs" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "social_accounts" drop column "rejected_brand_ids";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "account_rejected_brands" cascade;`);
    this.addSql(`drop table if exists "brand_excluded_venues" cascade;`);

    this.addSql(`alter table "apify_runs" drop constraint "apify_runs_pipeline_run_id_foreign";`);

    this.addSql(`alter table "brands" add "excluded_venue_ids" jsonb not null default '[]';`);

    this.addSql(`alter table "social_accounts" add "rejected_brand_ids" jsonb not null default '[]';`);
  }

}
