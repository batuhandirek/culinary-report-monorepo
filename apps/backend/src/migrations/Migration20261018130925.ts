import { Migration } from '@mikro-orm/migrations';

export class Migration20261018130925 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "brand_status" as enum ('confirmed', 'dismissed');`);
    this.addSql(`create type "brand_ownership" as enum ('independent', 'corporate');`);
    this.addSql(`create table "brands" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "name" text not null, "key" text not null, "status" "brand_status" not null, "ownership" "brand_ownership" null, "branches_searched_at" jsonb not null default '{}', "excluded_venue_ids" jsonb not null default '[]', primary key ("id"));`);
    this.addSql(`alter table "brands" add constraint "brands_key_unique" unique ("key");`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'SEARCH_BRANCHES' after 'SCRAPE_VENUES';`);

    this.addSql(`alter table "venues" add "brand_id" uuid null;`);
    this.addSql(`alter table "venues" add constraint "venues_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "venues_brand_id_index" on "venues" ("brand_id");`);

    this.addSql(`alter table "mentions" add "brand_level" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venues" drop constraint "venues_brand_id_foreign";`);

    this.addSql(`drop table if exists "brands" cascade;`);

    this.addSql(`alter table "mentions" drop column "brand_level";`);

    this.addSql(`drop index "venues_brand_id_index";`);
    this.addSql(`alter table "venues" drop column "brand_id";`);

    this.addSql(`drop type "brand_status";`);
    this.addSql(`drop type "brand_ownership";`);
  }

}
