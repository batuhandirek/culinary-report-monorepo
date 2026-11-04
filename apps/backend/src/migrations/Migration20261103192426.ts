import { Migration } from '@mikro-orm/migrations';

export class Migration20261103192426 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "analyst_message_status" as enum ('queued', 'running', 'done', 'failed');`);
    this.addSql(`create table "analyst_threads" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "title" text not null, "owner_id" uuid not null, "last_message_at" timestamptz not null default now(), "usd" double precision not null default 0, primary key ("id"));`);
    this.addSql(`create index "analyst_threads_owner_id_index" on "analyst_threads" ("owner_id");`);

    this.addSql(`create table "analyst_messages" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "thread_id" uuid not null, "author_id" uuid not null, "status" "analyst_message_status" not null default 'done', "model" text null, "usd" double precision null, "usage" jsonb null, "finished_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "analyst_messages_thread_id_created_at_index" on "analyst_messages" ("thread_id", "created_at");`);

    this.addSql(`create table "analyst_message_parts" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "message_id" uuid not null, "position" int not null, "data" jsonb not null, "streaming" boolean not null default false, primary key ("id"));`);
    this.addSql(`create index "analyst_message_parts_message_id_position_index" on "analyst_message_parts" ("message_id", "position");`);

    this.addSql(`alter table "analyst_threads" add constraint "analyst_threads_owner_id_foreign" foreign key ("owner_id") references "users" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "analyst_messages" add constraint "analyst_messages_thread_id_foreign" foreign key ("thread_id") references "analyst_threads" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "analyst_messages" add constraint "analyst_messages_author_id_foreign" foreign key ("author_id") references "users" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "analyst_message_parts" add constraint "analyst_message_parts_message_id_foreign" foreign key ("message_id") references "analyst_messages" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "analyst_messages" drop constraint "analyst_messages_thread_id_foreign";`);
    this.addSql(`alter table "analyst_message_parts" drop constraint "analyst_message_parts_message_id_foreign";`);

    this.addSql(`drop table if exists "analyst_threads" cascade;`);
    this.addSql(`drop table if exists "analyst_messages" cascade;`);
    this.addSql(`drop table if exists "analyst_message_parts" cascade;`);

    this.addSql(`drop type "analyst_message_status";`);
  }

}
