import { Migration } from '@mikro-orm/migrations';

export class Migration20261111023425 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "mention_topics" cascade;`);

    this.addSql(`alter table "mentions" drop column "cuisine";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create table "mention_topics" ("id" serial primary key, "created_at" timestamptz(6) not null default now(), "mention_id" int4 not null, "topic_id" uuid not null, "source" text not null, "rank" int4 not null);`);
    this.addSql(`alter table "mention_topics" add constraint "mention_topics_mention_id_topic_id_unique" unique ("mention_id", "topic_id");`);
    this.addSql(`create index "mention_topics_topic_id_index" on "mention_topics" ("topic_id");`);

    this.addSql(`alter table "mention_topics" add constraint "mention_topics_mention_id_foreign" foreign key ("mention_id") references "mentions" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "mention_topics" add constraint "mention_topics_topic_id_foreign" foreign key ("topic_id") references "topics" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "mentions" add "cuisine" text null;`);
  }

}
