import { Migration } from '@mikro-orm/migrations';

export class Migration20261104153621 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "social_account_handle_changes" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "account_id" uuid not null, "from_handle" text null, "to_handle" text null, "taken_by_id" uuid null, "seen_at" timestamptz not null, "source" "account_snapshot_source" not null, primary key ("id"));`);
    this.addSql(`create index "social_account_handle_changes_account_id_index" on "social_account_handle_changes" ("account_id");`);

    this.addSql(`alter table "social_account_handle_changes" add constraint "social_account_handle_changes_account_id_foreign" foreign key ("account_id") references "social_accounts" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "social_account_handle_changes" add constraint "social_account_handle_changes_taken_by_id_foreign" foreign key ("taken_by_id") references "social_accounts" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "social_accounts" add "platform_user_id" text null, add "handle_lost_at" timestamptz null;`);
    this.addSql(`alter table "social_accounts" add constraint "social_accounts_platform_platform_user_id_unique" unique ("platform", "platform_user_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "social_account_handle_changes" cascade;`);

    this.addSql(`alter table "social_accounts" drop constraint "social_accounts_platform_platform_user_id_unique";`);
    this.addSql(`alter table "social_accounts" drop column "platform_user_id", drop column "handle_lost_at";`);
  }

}
