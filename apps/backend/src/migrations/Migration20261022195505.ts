import { Migration } from '@mikro-orm/migrations';

export class Migration20261022195505 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "backlog_runs" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "key" text not null, "day" text not null, "batches" int not null default 0, "done" int not null default 0, "tokens" int null, "stop_reason" text null, "error" text null, "remaining" int null, "finished_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "backlog_runs" add constraint "backlog_runs_key_day_unique" unique ("key", "day");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "backlog_runs" cascade;`);
  }

}
