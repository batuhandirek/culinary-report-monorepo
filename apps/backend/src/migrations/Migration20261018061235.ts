import { Migration } from '@mikro-orm/migrations';

export class Migration20261018061235 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "trend_related_queries" ("id" serial primary key, "created_at" timestamptz not null default now(), "city_id" uuid not null, "kind" "search_term_kind" not null, "term" text not null, "venue_id" uuid null, "month" text not null, "rising" boolean not null, "rank" int not null, "query" text not null, "value" int not null, "breakout" boolean not null default false);`);
    this.addSql(`create index "trend_related_queries_city_id_month_index" on "trend_related_queries" ("city_id", "month");`);
    this.addSql(`alter table "trend_related_queries" add constraint "trend_related_queries_city_id_kind_term_month_ris_b194a_unique" unique ("city_id", "kind", "term", "month", "rising", "query");`);

    this.addSql(`alter table "trend_related_queries" add constraint "trend_related_queries_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "trend_related_queries" add constraint "trend_related_queries_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "trend_related_queries" cascade;`);
  }

}
