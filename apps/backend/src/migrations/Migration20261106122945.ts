import { Migration } from '@mikro-orm/migrations';

export class Migration20261106122945 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "provider_credit_snapshots" cascade;`);

    this.addSql(`drop type "credit_snapshot_source";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create type "credit_snapshot_source" as enum ('api', 'manual');`);
    this.addSql(`create table "provider_credit_snapshots" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), "deleted_at" timestamptz(6) null, "provider" "spend_provider" not null, "at" timestamptz(6) not null, "limit_usd" float8 not null, "used_usd" float8 not null, "cycle_start" timestamptz(6) null, "cycle_end" timestamptz(6) null, "source" "credit_snapshot_source" not null, "note" text null, primary key ("id"));`);
    this.addSql(`create index "provider_credit_snapshots_provider_at_index" on "provider_credit_snapshots" ("provider", "at");`);
  }

}
