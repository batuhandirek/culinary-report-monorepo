import { Migration } from '@mikro-orm/migrations';

export class Migration20261018122311 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "venue_food_topics" ("id" serial primary key, "created_at" timestamptz not null default now(), "venue_id" uuid not null, "topic_id" uuid not null, "excluded" boolean not null default false);`);
    this.addSql(`create index "venue_food_topics_venue_id_index" on "venue_food_topics" ("venue_id");`);
    this.addSql(`alter table "venue_food_topics" add constraint "venue_food_topics_venue_id_topic_id_unique" unique ("venue_id", "topic_id");`);

    this.addSql(`alter table "venue_food_topics" add constraint "venue_food_topics_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "venue_food_topics" add constraint "venue_food_topics_topic_id_foreign" foreign key ("topic_id") references "food_topics" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "venue_food_topics" cascade;`);
  }

}
