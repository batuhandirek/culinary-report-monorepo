import { Migration } from '@mikro-orm/migrations';

export class Migration20261105212703 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "venue_search_ranks" cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create table "venue_search_ranks" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), "deleted_at" timestamptz(6) null, "venue_id" uuid not null, "month" text not null, "query" text not null, "rank" int4 null, "results" int4 not null, "top" jsonb not null, "searched_at" timestamptz(6) not null, primary key ("id"));`);
    this.addSql(`create index "venue_search_ranks_month_index" on "venue_search_ranks" ("month");`);
    this.addSql(`alter table "venue_search_ranks" add constraint "venue_search_ranks_venue_id_month_query_unique" unique ("venue_id", "month", "query");`);

    this.addSql(`alter table "venue_search_ranks" add constraint "venue_search_ranks_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
  }

}
