import { Migration } from '@mikro-orm/migrations';

export class Migration20261025111959 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "dish_search_ranks" ("id" serial primary key, "created_at" timestamptz not null default now(), "city_id" uuid not null, "topic_id" uuid not null, "district" text not null, "month" text not null, "rank" int not null, "place_id" text not null, "name" text not null, "rating" real null, "reviews_count" int null, "venue_id" uuid null, "searched_at" timestamptz not null);`);
    this.addSql(`create index "dish_search_ranks_month_index" on "dish_search_ranks" ("month");`);
    this.addSql(`create index "dish_search_ranks_venue_id_index" on "dish_search_ranks" ("venue_id");`);
    this.addSql(`alter table "dish_search_ranks" add constraint "dish_search_ranks_city_id_topic_id_district_month_rank_unique" unique ("city_id", "topic_id", "district", "month", "rank");`);

    this.addSql(`alter table "dish_search_ranks" add constraint "dish_search_ranks_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "dish_search_ranks" add constraint "dish_search_ranks_topic_id_foreign" foreign key ("topic_id") references "food_topics" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "dish_search_ranks" add constraint "dish_search_ranks_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete set null;`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'TRACK_DISH_SEARCHES' after 'TRACK_SEARCH_RANKS';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "dish_search_ranks" cascade;`);
  }

}
