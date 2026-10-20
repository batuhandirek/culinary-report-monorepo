import { Migration } from '@mikro-orm/migrations';

export class Migration20261017201433 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "city_source_kind" as enum ('tiktok_hashtag', 'tiktok_search', 'instagram_hashtag');`);
    this.addSql(`create table "cities" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "slug" text not null, "name" text not null, "aliases" jsonb not null, "country" text not null, "timezone" text not null, "language" text not null, "location_query" text not null, "tiktok_region" text not null, "instagram_enabled" boolean not null default true, "lat" double precision null, "lng" double precision null, "districts" jsonb not null, "name_stopwords" jsonb not null, "chain_deny_list" jsonb not null, "step_budgets_usd" jsonb not null, "top_venues" int not null default 20, "cron_enabled" boolean not null default false, "active" boolean not null default true, primary key ("id"));`);
    this.addSql(`alter table "cities" add constraint "cities_slug_unique" unique ("slug");`);

    this.addSql(`create table "city_sources" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "city_id" uuid not null, "kind" "city_source_kind" not null, "value" text not null, "enabled" boolean not null default true, "note" text null, primary key ("id"));`);
    this.addSql(`alter table "city_sources" add constraint "city_sources_city_id_kind_value_unique" unique ("city_id", "kind", "value");`);

    this.addSql(`alter table "city_sources" add constraint "city_sources_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "pipeline_runs" add "city_id" uuid null;`);
    this.addSql(`alter table "pipeline_runs" add constraint "pipeline_runs_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "pipeline_runs_city_id_index" on "pipeline_runs" ("city_id");`);

    this.addSql(`alter table "social_posts" add "city_id" uuid null;`);
    this.addSql(`alter table "social_posts" add constraint "social_posts_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "social_posts_city_id_index" on "social_posts" ("city_id");`);

    this.addSql(`alter table "venues" add "city_id" uuid null;`);
    this.addSql(`alter table "venues" add constraint "venues_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "venues" rename column "city" to "locality";`);
    this.addSql(`create index "venues_city_id_index" on "venues" ("city_id");`);

    this.addSql(`alter table "venue_lookups" drop constraint "venue_lookups_query_unique";`);
    this.addSql(`alter table "venue_lookups" add "city_id" uuid null;`);
    this.addSql(`alter table "venue_lookups" add constraint "venue_lookups_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "venue_lookups" add constraint "venue_lookups_city_id_query_unique" unique ("city_id", "query");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "city_sources" drop constraint "city_sources_city_id_foreign";`);
    this.addSql(`alter table "pipeline_runs" drop constraint "pipeline_runs_city_id_foreign";`);
    this.addSql(`alter table "social_posts" drop constraint "social_posts_city_id_foreign";`);
    this.addSql(`alter table "venues" drop constraint "venues_city_id_foreign";`);
    this.addSql(`alter table "venue_lookups" drop constraint "venue_lookups_city_id_foreign";`);

    this.addSql(`drop table if exists "cities" cascade;`);
    this.addSql(`drop table if exists "city_sources" cascade;`);

    this.addSql(`drop index "pipeline_runs_city_id_index";`);
    this.addSql(`alter table "pipeline_runs" drop column "city_id";`);

    this.addSql(`drop index "social_posts_city_id_index";`);
    this.addSql(`alter table "social_posts" drop column "city_id";`);

    this.addSql(`alter table "venue_lookups" drop constraint "venue_lookups_city_id_query_unique";`);
    this.addSql(`alter table "venue_lookups" drop column "city_id";`);
    this.addSql(`alter table "venue_lookups" add constraint "venue_lookups_query_unique" unique ("query");`);

    this.addSql(`drop index "venues_city_id_index";`);
    this.addSql(`alter table "venues" drop column "city_id";`);
    this.addSql(`alter table "venues" rename column "locality" to "city";`);

    this.addSql(`drop type "city_source_kind";`);
  }

}
