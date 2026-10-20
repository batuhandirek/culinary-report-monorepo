import { Migration } from '@mikro-orm/migrations';

export class Migration20261017210053 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "review_platform" as enum ('google', 'tripadvisor');`);
    this.addSql(`create type "venue_status_change_kind" as enum ('opened', 'temporarily_closed', 'permanently_closed', 'reopened');`);
    this.addSql(`create type "venue_scrape_source" as enum ('city', 'lookup', 'details');`);
    this.addSql(`create table "venue_search_ranks" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "venue_id" uuid not null, "month" text not null, "query" text not null, "rank" int null, "results" int not null, "top" jsonb not null, "searched_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create index "venue_search_ranks_month_index" on "venue_search_ranks" ("month");`);
    this.addSql(`alter table "venue_search_ranks" add constraint "venue_search_ranks_venue_id_month_query_unique" unique ("venue_id", "month", "query");`);

    this.addSql(`create table "venue_status_changes" ("id" serial primary key, "created_at" timestamptz not null default now(), "venue_id" uuid not null, "at" timestamptz not null, "kind" "venue_status_change_kind" not null, "source" "venue_scrape_source" not null);`);
    this.addSql(`create index "venue_status_changes_venue_id_index" on "venue_status_changes" ("venue_id");`);
    this.addSql(`create index "venue_status_changes_kind_at_index" on "venue_status_changes" ("kind", "at");`);

    this.addSql(`alter table "venue_search_ranks" add constraint "venue_search_ranks_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venue_status_changes" add constraint "venue_status_changes_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "cities" add "venues_scraped_at" timestamptz null;`);

    this.addSql(`alter table "venues" add "tripadvisor_rating" real null, add "tripadvisor_reviews_count" int null;`);

    this.addSql(`alter table "google_reviews" add "platform" "review_platform" not null default 'google';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "venue_search_ranks" cascade;`);
    this.addSql(`drop table if exists "venue_status_changes" cascade;`);

    this.addSql(`alter table "cities" drop column "venues_scraped_at";`);

    this.addSql(`alter table "google_reviews" drop column "platform";`);

    this.addSql(`alter table "venues" drop column "tripadvisor_rating", drop column "tripadvisor_reviews_count";`);

    this.addSql(`drop type "review_platform";`);
    this.addSql(`drop type "venue_status_change_kind";`);
    this.addSql(`drop type "venue_scrape_source";`);
  }

}
