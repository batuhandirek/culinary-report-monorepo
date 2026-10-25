import { Migration } from '@mikro-orm/migrations';

export class Migration20261022201356 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "feedback_points" ("id" serial primary key, "created_at" timestamptz not null default now(), "source_kind" text not null, "review_id" uuid null, "mention_id" int null, "city_id" uuid not null, "month" text not null, "sentiment" text not null, "topic" text null, "theme" text null, "detail" text null, "dish" text null, "dish_key" text null, "food_topic_id" uuid null, "amount" double precision null, "unit" text null, "dish_checked_at" timestamptz null, "amount_checked_at" timestamptz null);`);
    this.addSql(`create index "feedback_points_review_id_index" on "feedback_points" ("review_id");`);
    this.addSql(`create index "feedback_points_mention_id_index" on "feedback_points" ("mention_id");`);
    this.addSql(`create index "feedback_points_food_topic_id_month_index" on "feedback_points" ("food_topic_id", "month");`);
    this.addSql(`create index "feedback_points_city_id_month_index" on "feedback_points" ("city_id", "month");`);

    this.addSql(`alter table "feedback_points" add constraint "feedback_points_review_id_foreign" foreign key ("review_id") references "reviews" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "feedback_points" add constraint "feedback_points_mention_id_foreign" foreign key ("mention_id") references "mentions" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "feedback_points" add constraint "feedback_points_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "feedback_points" add constraint "feedback_points_food_topic_id_foreign" foreign key ("food_topic_id") references "food_topics" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "feedback_points" add constraint "feedback_points_one_source_check" check ((review_id is null) <> (mention_id is null));`);

    this.addSql(`alter table "mentions" alter column "dishes" drop not null;`);
    this.addSql(`alter table "mentions" alter column "praise" drop not null;`);
    this.addSql(`alter table "mentions" alter column "complaints" drop not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "feedback_points" cascade;`);

    this.addSql(`alter table "mentions" alter column "dishes" set not null;`);
    this.addSql(`alter table "mentions" alter column "praise" set not null;`);
    this.addSql(`alter table "mentions" alter column "complaints" set not null;`);
  }

}
