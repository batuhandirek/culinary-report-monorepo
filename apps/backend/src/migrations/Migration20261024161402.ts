import { Migration } from '@mikro-orm/migrations';

export class Migration20261024161402 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "dish_names" ("id" serial primary key, "created_at" timestamptz not null default now(), "key" text not null, "name" text not null, "food_topic_id" uuid null, "decided_by" text null, "decided_at" timestamptz null, "suggestion" text null);`);
    this.addSql(`alter table "dish_names" add constraint "dish_names_key_unique" unique ("key");`);
    this.addSql(`create index "dish_names_food_topic_id_index" on "dish_names" ("food_topic_id");`);

    this.addSql(`alter table "dish_names" add constraint "dish_names_food_topic_id_foreign" foreign key ("food_topic_id") references "food_topics" ("id") on update cascade on delete set null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "dish_names" cascade;`);
  }

}
