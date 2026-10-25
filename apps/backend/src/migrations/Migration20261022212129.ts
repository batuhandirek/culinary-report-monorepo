import { Migration } from '@mikro-orm/migrations';

export class Migration20261022212129 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "mention_food_topics" ("id" serial primary key, "created_at" timestamptz not null default now(), "mention_id" int not null, "topic_id" uuid not null, "source" text not null, "rank" int not null);`);
    this.addSql(`create index "mention_food_topics_topic_id_index" on "mention_food_topics" ("topic_id");`);
    this.addSql(`alter table "mention_food_topics" add constraint "mention_food_topics_mention_id_topic_id_unique" unique ("mention_id", "topic_id");`);

    this.addSql(`create table "menu_item_food_topics" ("id" serial primary key, "created_at" timestamptz not null default now(), "menu_item_id" int not null, "topic_id" uuid not null);`);
    this.addSql(`create index "menu_item_food_topics_topic_id_index" on "menu_item_food_topics" ("topic_id");`);
    this.addSql(`alter table "menu_item_food_topics" add constraint "menu_item_food_topics_menu_item_id_topic_id_unique" unique ("menu_item_id", "topic_id");`);

    this.addSql(`alter table "mention_food_topics" add constraint "mention_food_topics_mention_id_foreign" foreign key ("mention_id") references "mentions" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "mention_food_topics" add constraint "mention_food_topics_topic_id_foreign" foreign key ("topic_id") references "food_topics" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "menu_item_food_topics" add constraint "menu_item_food_topics_menu_item_id_foreign" foreign key ("menu_item_id") references "menu_items" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "menu_item_food_topics" add constraint "menu_item_food_topics_topic_id_foreign" foreign key ("topic_id") references "food_topics" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venue_food_topics" drop constraint "venue_food_topics_venue_id_topic_id_unique";`);
    this.addSql(`alter table "venue_food_topics" add "computed" boolean not null default false, add "source" text null, add "score" double precision null, add "primary" boolean not null default false;`);
    this.addSql(`create index "venue_food_topics_topic_id_computed_primary_index" on "venue_food_topics" ("topic_id", "computed", "primary");`);
    this.addSql(`alter table "venue_food_topics" add constraint "venue_food_topics_venue_id_topic_id_computed_unique" unique ("venue_id", "topic_id", "computed");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "mention_food_topics" cascade;`);
    this.addSql(`drop table if exists "menu_item_food_topics" cascade;`);

    this.addSql(`drop index "venue_food_topics_topic_id_computed_primary_index";`);
    this.addSql(`alter table "venue_food_topics" drop constraint "venue_food_topics_venue_id_topic_id_computed_unique";`);
    this.addSql(`alter table "venue_food_topics" drop column "computed", drop column "source", drop column "score", drop column "primary";`);
    this.addSql(`alter table "venue_food_topics" add constraint "venue_food_topics_venue_id_topic_id_unique" unique ("venue_id", "topic_id");`);
  }

}
