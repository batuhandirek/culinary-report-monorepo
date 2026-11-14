import { Migration } from '@mikro-orm/migrations';

export class Migration20261114102626 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "menu_item_terms" ("id" serial primary key, "created_at" timestamptz not null default now(), "menu_item_id" int not null, "term_id" int not null, "method" text not null);`);
    this.addSql(`create index "menu_item_terms_term_id_index" on "menu_item_terms" ("term_id");`);
    this.addSql(`alter table "menu_item_terms" add constraint "menu_item_terms_menu_item_id_term_id_unique" unique ("menu_item_id", "term_id");`);

    this.addSql(`alter table "menu_item_terms" add constraint "menu_item_terms_menu_item_id_foreign" foreign key ("menu_item_id") references "menu_items" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "menu_item_terms" add constraint "menu_item_terms_term_id_foreign" foreign key ("term_id") references "terms" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venues" add "delivery_searched_at" timestamptz null;`);

    this.addSql(`alter type "delivery_platform" add value if not exists 'uber_eats' after 'lieferando';`);
    this.addSql(`alter table "venue_delivery_listings" add "name" text null, add "address" text null, add "cuisines" jsonb null, add "eta_min" int null, add "eta_max" int null, add "menu_fetched_at" timestamptz null, add "removed_at" timestamptz null;`);

    // Edited by hand: the generator read the dropped "month" and the new "key" as a rename. A menu
    // item is one row per listing now, no longer one per month, so the old rows (a copy a month)
    // can't be carried: they go, and the next delivery run reads the menus again
    this.addSql(`delete from "menu_items";`);
    this.addSql(`drop index "menu_items_listing_id_month_index";`);
    this.addSql(`alter table "menu_items" drop column "month";`);
    this.addSql(`alter table "menu_items" add "key" text not null, add "description" text null, add "prices" jsonb not null, add "external_id" text null, add "liked_share" real null, add "ratings_count" int null, add "first_seen_at" timestamptz not null, add "last_seen_at" timestamptz not null, add "removed_at" timestamptz null;`);
    this.addSql(`create index "menu_items_listing_id_removed_at_index" on "menu_items" ("listing_id", "removed_at");`);
    this.addSql(`alter table "menu_items" add constraint "menu_items_listing_id_key_unique" unique ("listing_id", "key");`);

    this.addSql(`alter table "venue_delivery_snapshots" add "eta_min" int null, add "eta_max" int null, add "menu_items" int null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "menu_item_terms" cascade;`);

    this.addSql(`drop index "menu_items_listing_id_removed_at_index";`);
    this.addSql(`alter table "menu_items" drop constraint "menu_items_listing_id_key_unique";`);
    this.addSql(`delete from "menu_items";`);
    this.addSql(`alter table "menu_items" drop column "key", drop column "description", drop column "prices", drop column "external_id", drop column "liked_share", drop column "ratings_count", drop column "first_seen_at", drop column "last_seen_at", drop column "removed_at";`);
    this.addSql(`alter table "menu_items" add "month" text not null;`);
    this.addSql(`create index "menu_items_listing_id_month_index" on "menu_items" ("listing_id", "month");`);

    this.addSql(`alter table "venue_delivery_listings" drop column "name", drop column "address", drop column "cuisines", drop column "eta_min", drop column "eta_max", drop column "menu_fetched_at", drop column "removed_at";`);

    this.addSql(`alter table "venue_delivery_snapshots" drop column "eta_min", drop column "eta_max", drop column "menu_items";`);

    this.addSql(`alter table "venues" drop column "delivery_searched_at";`);
  }

}
