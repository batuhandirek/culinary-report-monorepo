import { Migration } from '@mikro-orm/migrations';

export class Migration20261106161020 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "apify_runs" drop constraint "apify_runs_pipeline_run_id_foreign";`);

    this.addSql(`drop table if exists "pipeline_runs" cascade;`);

    this.addSql(`drop index "apify_runs_pipeline_run_id_index";`);
    this.addSql(`alter table "apify_runs" drop column "pipeline_run_id", drop column "step_key";`);

    this.addSql(`drop type "pipeline_run_status";`);
    this.addSql(`drop type "pipeline_step";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create type "pipeline_run_status" as enum ('QUEUED', 'RUNNING', 'WAITING', 'SUCCEEDED', 'FAILED');`);
    this.addSql(`create type "pipeline_step" as enum ('SCRAPE_VENUES', 'SEARCH_BRANCHES', 'SYNC_OSM_PLACES', 'LOOKUP_OSM_PLACES', 'SCRAPE_TIKTOK', 'SCRAPE_TIKTOK_RECENT', 'SCRAPE_INSTAGRAM', 'SCRAPE_INSTAGRAM_RECENT', 'SCRAPE_INSTAGRAM_REELS', 'SCRAPE_BLOGS', 'EXTRACT_MENTIONS', 'MATCH_MENTIONS', 'LOOKUP_VENUES', 'SCRAPE_VENUE_SOCIAL', 'SCRAPE_VENUE_SOCIAL_RECENT', 'FILL_COMPETITORS', 'SCRAPE_REVIEWS', 'BACKFILL_REVIEWS', 'ANALYSE_REVIEWS', 'REFRESH_VENUE_DETAILS', 'SCRAPE_ACCOUNTS', 'SCRAPE_ACCOUNTS_RECENT', 'SCRAPE_CREATORS', 'FILL_ACCOUNT_FOLLOWERS', 'TRACK_PROFILES', 'FIND_OWN_ACCOUNTS', 'READ_MENTIONED_PROFILES', 'SCRAPE_COMMENTS', 'ANALYSE_COMMENTS', 'SCRAPE_PRESS', 'TRACK_DISH_SEARCHES', 'SEARCH_INTEREST', 'BUILD_REPORTS', 'SCORE_LEADS', 'WATCH_REVIEWS', 'SAMPLE_BUSYNESS', 'SAMPLE_RESERVATIONS', 'SNAPSHOT_RATINGS', 'SCRAPE_DELIVERY', 'REFRESH_POST_COUNTS', 'MONTHLY');`);
    this.addSql(`create table "pipeline_runs" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), "deleted_at" timestamptz(6) null, "step" "pipeline_step" not null, "month" text not null, "status" "pipeline_run_status" not null, "params" jsonb null, "result" jsonb null, "error" text null, "started_at" timestamptz(6) null, "finished_at" timestamptz(6) null, "city_id" uuid not null, "resumes" int4 not null default 0, "waiting_since" timestamptz(6) null, primary key ("id"));`);
    this.addSql(`create index "pipeline_runs_city_id_index" on "pipeline_runs" ("city_id");`);
    this.addSql(`create index "pipeline_runs_status_index" on "pipeline_runs" ("status");`);

    this.addSql(`alter table "pipeline_runs" add constraint "pipeline_runs_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete no action;`);

    this.addSql(`alter table "apify_runs" add "pipeline_run_id" uuid null, add "step_key" text null;`);
    this.addSql(`alter table "apify_runs" add constraint "apify_runs_pipeline_run_id_foreign" foreign key ("pipeline_run_id") references "pipeline_runs" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "apify_runs_pipeline_run_id_index" on "apify_runs" ("pipeline_run_id");`);
  }

}
