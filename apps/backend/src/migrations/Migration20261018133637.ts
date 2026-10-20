import { Migration } from '@mikro-orm/migrations';

export class Migration20261018133637 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "food_topic_ignored_words" ("id" serial primary key, "created_at" timestamptz not null default now(), "key" text not null);`);
    this.addSql(`alter table "food_topic_ignored_words" add constraint "food_topic_ignored_words_key_unique" unique ("key");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "food_topic_ignored_words" cascade;`);
  }

}
