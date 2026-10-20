import { Migration } from '@mikro-orm/migrations';

export class Migration20261015185759 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "apify_run_status" as enum ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');`);
    this.addSql(`create type "pipeline_step" as enum ('SCRAPE_VENUES', 'SCRAPE_TIKTOK', 'EXTRACT_MENTIONS', 'MATCH_MENTIONS', 'LOOKUP_VENUES', 'SCRAPE_VENUE_SOCIAL', 'SCRAPE_REVIEWS', 'ANALYSE_REVIEWS', 'BUILD_REPORTS', 'MONTHLY');`);
    this.addSql(`create type "pipeline_run_status" as enum ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');`);
    this.addSql(`create type "social_platform" as enum ('tiktok', 'instagram');`);
    this.addSql(`create type "mention_match_method" as enum ('exact', 'fuzzy', 'llm', 'none', 'other_city');`);
    this.addSql(`create table "apify_runs" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "actor_id" text not null, "purpose" text not null, "status" "apify_run_status" not null, "apify_run_id" text null, "max_cost_usd" real not null, "cost_usd" real null, "item_count" int null, "finished_at" timestamptz null, "error" text null, primary key ("id"));`);
    this.addSql(`create index "apify_runs_status_index" on "apify_runs" ("status");`);

    this.addSql(`create table "pipeline_runs" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "step" "pipeline_step" not null, "month" text not null, "status" "pipeline_run_status" not null, "params" jsonb null, "result" jsonb null, "error" text null, "started_at" timestamptz null, "finished_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "pipeline_runs_status_index" on "pipeline_runs" ("status");`);

    this.addSql(`create table "social_posts" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "external_id" text not null, "platform" "social_platform" not null, "url" text not null, "posted_at" timestamptz not null, "author" text null, "author_fans" int null, "views" int not null default 0, "likes" int not null default 0, "shares" int not null default 0, "comments" int not null default 0, "saves" int not null default 0, "is_ad" boolean not null default false, "location_name" text null, "source" text null, "text" text null, "hashtags" jsonb null, "tagged_handles" jsonb null, "subtitles" text null, "subtitles_language" text null, "analysed_at" timestamptz null, "is_promotional" boolean null, "analysis_tokens" int null, primary key ("id"));`);
    this.addSql(`alter table "social_posts" add constraint "social_posts_external_id_unique" unique ("external_id");`);
    this.addSql(`create index "social_posts_platform_index" on "social_posts" ("platform");`);
    this.addSql(`create index "social_posts_posted_at_index" on "social_posts" ("posted_at");`);

    this.addSql(`create table "venues" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "place_id" text not null, "name" text not null, "city" text null, "district" text null, "street" text null, "postal_code" text null, "category" text null, "categories" jsonb null, "lat" double precision null, "lng" double precision null, "price_level" text null, "website" text null, "phone" text null, "google_url" text null, "closed" boolean not null default false, "rating" real null, "reviews_count" int null, primary key ("id"));`);
    this.addSql(`alter table "venues" add constraint "venues_place_id_unique" unique ("place_id");`);
    this.addSql(`create index "venues_name_index" on "venues" ("name");`);
    this.addSql(`create index "venues_district_index" on "venues" ("district");`);

    this.addSql(`create table "reports" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "venue_id" uuid not null, "month" text not null, "data" jsonb not null, "highlights" jsonb not null, "post_count" int not null default 0, "review_count" int not null default 0, primary key ("id"));`);
    this.addSql(`create index "reports_month_index" on "reports" ("month");`);
    this.addSql(`alter table "reports" add constraint "reports_venue_id_month_unique" unique ("venue_id", "month");`);

    this.addSql(`create table "mentions" ("id" serial primary key, "created_at" timestamptz not null default now(), "post_id" uuid not null, "venue_name" text not null, "location_hint" text null, "cuisine" text null, "city" text null, "visited" boolean not null, "sentiment" text not null, "summary" text not null, "dishes" jsonb not null, "praise" jsonb not null, "complaints" jsonb not null, "venue_id" uuid null, "match_method" "mention_match_method" null, "match_score" real null, "matched_at" timestamptz null);`);
    this.addSql(`create index "mentions_venue_id_index" on "mentions" ("venue_id");`);

    this.addSql(`create table "google_reviews" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "review_id" text not null, "venue_id" uuid not null, "published_at" timestamptz not null, "stars" int null, "text" text null, "text_translated" text null, "language" text null, "likes" int not null default 0, "owner_response" text null, "owner_response_at" timestamptz null, "sentiment" text null, "praise" jsonb null, "complaints" jsonb null, "dishes" jsonb null, "changes" jsonb null, "analysed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "google_reviews" add constraint "google_reviews_review_id_unique" unique ("review_id");`);
    this.addSql(`create index "google_reviews_venue_id_published_at_index" on "google_reviews" ("venue_id", "published_at");`);

    this.addSql(`create table "venue_lookups" ("id" serial primary key, "created_at" timestamptz not null default now(), "query" text not null, "results" int not null);`);
    this.addSql(`alter table "venue_lookups" add constraint "venue_lookups_query_unique" unique ("query");`);

    this.addSql(`create table "venue_snapshots" ("id" serial primary key, "created_at" timestamptz not null default now(), "venue_id" uuid not null, "snapshot_date" text not null, "rating" real null, "reviews_count" int null);`);
    this.addSql(`alter table "venue_snapshots" add constraint "venue_snapshots_venue_id_snapshot_date_unique" unique ("venue_id", "snapshot_date");`);

    this.addSql(`alter table "reports" add constraint "reports_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "mentions" add constraint "mentions_post_id_foreign" foreign key ("post_id") references "social_posts" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "mentions" add constraint "mentions_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "google_reviews" add constraint "google_reviews_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venue_snapshots" add constraint "venue_snapshots_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "mentions" drop constraint "mentions_post_id_foreign";`);
    this.addSql(`alter table "reports" drop constraint "reports_venue_id_foreign";`);
    this.addSql(`alter table "mentions" drop constraint "mentions_venue_id_foreign";`);
    this.addSql(`alter table "google_reviews" drop constraint "google_reviews_venue_id_foreign";`);
    this.addSql(`alter table "venue_snapshots" drop constraint "venue_snapshots_venue_id_foreign";`);

    this.addSql(`drop table if exists "apify_runs" cascade;`);
    this.addSql(`drop table if exists "pipeline_runs" cascade;`);
    this.addSql(`drop table if exists "social_posts" cascade;`);
    this.addSql(`drop table if exists "venues" cascade;`);
    this.addSql(`drop table if exists "reports" cascade;`);
    this.addSql(`drop table if exists "mentions" cascade;`);
    this.addSql(`drop table if exists "google_reviews" cascade;`);
    this.addSql(`drop table if exists "venue_lookups" cascade;`);
    this.addSql(`drop table if exists "venue_snapshots" cascade;`);

    this.addSql(`drop type "apify_run_status";`);
    this.addSql(`drop type "pipeline_step";`);
    this.addSql(`drop type "pipeline_run_status";`);
    this.addSql(`drop type "social_platform";`);
    this.addSql(`drop type "mention_match_method";`);
  }

}
