import { Migration } from '@mikro-orm/migrations';

export class Migration20261017204635 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "delivery_platform" as enum ('wolt', 'lieferando');`);
    this.addSql(`create type "reservation_platform" as enum ('thefork', 'opentable');`);
    this.addSql(`create table "venue_busyness" ("id" serial primary key, "created_at" timestamptz not null default now(), "venue_id" uuid not null, "sampled_at" timestamptz not null, "histogram" jsonb null, "busyness_index" real null, "live_percent" int null, "live_text" text null);`);
    this.addSql(`create index "venue_busyness_venue_id_sampled_at_index" on "venue_busyness" ("venue_id", "sampled_at");`);

    this.addSql(`create table "venue_delivery_listings" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "venue_id" uuid not null, "platform" "delivery_platform" not null, "url" text not null, "external_id" text null, "rating" real null, "reviews_count" int null, "delivery_fee" real null, "min_order" real null, "currency" text null, "fetched_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "venue_delivery_listings" add constraint "venue_delivery_listings_venue_id_platform_unique" unique ("venue_id", "platform");`);

    this.addSql(`create table "menu_items" ("id" serial primary key, "created_at" timestamptz not null default now(), "listing_id" uuid not null, "month" text not null, "name" text not null, "price" real not null, "category" text null);`);
    this.addSql(`create index "menu_items_listing_id_month_index" on "menu_items" ("listing_id", "month");`);

    this.addSql(`create table "venue_reservation_samples" ("id" serial primary key, "created_at" timestamptz not null default now(), "venue_id" uuid not null, "platform" "reservation_platform" not null, "sampled_at" timestamptz not null, "for_date" text not null, "slots_open" int not null, "slots_asked" int not null, "party_size" int null);`);
    this.addSql(`create index "venue_reservation_samples_venue_id_for_date_index" on "venue_reservation_samples" ("venue_id", "for_date");`);

    this.addSql(`alter table "venue_busyness" add constraint "venue_busyness_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venue_delivery_listings" add constraint "venue_delivery_listings_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "menu_items" add constraint "menu_items_listing_id_foreign" foreign key ("listing_id") references "venue_delivery_listings" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venue_reservation_samples" add constraint "venue_reservation_samples_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'SAMPLE_BUSYNESS' after 'WATCH_REVIEWS';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'SAMPLE_RESERVATIONS' after 'SAMPLE_BUSYNESS';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_DELIVERY' after 'SAMPLE_RESERVATIONS';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "menu_items" drop constraint "menu_items_listing_id_foreign";`);

    this.addSql(`drop table if exists "venue_busyness" cascade;`);
    this.addSql(`drop table if exists "venue_delivery_listings" cascade;`);
    this.addSql(`drop table if exists "menu_items" cascade;`);
    this.addSql(`drop table if exists "venue_reservation_samples" cascade;`);

    this.addSql(`drop type "delivery_platform";`);
    this.addSql(`drop type "reservation_platform";`);
  }

}
