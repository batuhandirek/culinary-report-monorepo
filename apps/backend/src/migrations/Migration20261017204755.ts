import { Migration } from '@mikro-orm/migrations';

export class Migration20261017204755 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "city_event_kind" as enum ('school_holiday', 'event');`);
    this.addSql(`create type "search_term_kind" as enum ('cuisine', 'venue');`);
    this.addSql(`create table "city_days" ("id" serial primary key, "created_at" timestamptz not null default now(), "city_id" uuid not null, "date" text not null, "t_max" real null, "rain_mm" real null, "holiday" text null);`);
    this.addSql(`alter table "city_days" add constraint "city_days_city_id_date_unique" unique ("city_id", "date");`);

    this.addSql(`create table "city_events" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "city_id" uuid not null, "kind" "city_event_kind" not null, "name" text not null, "start_date" text not null, "end_date" text not null, primary key ("id"));`);

    this.addSql(`create table "trend_search_interest" ("id" serial primary key, "created_at" timestamptz not null default now(), "city_id" uuid not null, "kind" "search_term_kind" not null, "term" text not null, "venue_id" uuid null, "month" text not null, "interest" real null);`);
    this.addSql(`alter table "trend_search_interest" add constraint "trend_search_interest_city_id_kind_term_month_unique" unique ("city_id", "kind", "term", "month");`);

    this.addSql(`alter table "city_days" add constraint "city_days_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "city_events" add constraint "city_events_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "trend_search_interest" add constraint "trend_search_interest_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "trend_search_interest" add constraint "trend_search_interest_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "cities" add "region" text null;`);

    this.addSql(`alter table "city_sources" add "suggested" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "city_days" cascade;`);
    this.addSql(`drop table if exists "city_events" cascade;`);
    this.addSql(`drop table if exists "trend_search_interest" cascade;`);

    this.addSql(`alter table "cities" drop column "region";`);

    this.addSql(`alter table "city_sources" drop column "suggested";`);

    this.addSql(`drop type "city_event_kind";`);
    this.addSql(`drop type "search_term_kind";`);
  }

}
