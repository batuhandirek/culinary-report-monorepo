import { Migration } from '@mikro-orm/migrations';

export class Migration20261106145417 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "embeddings" cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create table "embeddings" ("id" serial primary key, "created_at" timestamptz(6) not null default now(), "input" text not null, "embedding" halfvec not null, "model" text not null, "dimensions" int4 not null, "tokens_used" int4 not null);`);
    this.addSql(`create index "embeddings_input_index" on "embeddings" ("input");`);
    this.addSql(`alter table "embeddings" add constraint "embeddings_input_unique" unique ("input");`);
  }

}
