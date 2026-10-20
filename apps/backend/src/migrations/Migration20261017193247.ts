import { Migration } from '@mikro-orm/migrations';

export class Migration20261017193247 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "report_shares" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "report_id" uuid not null, "token" text not null, "created_by_id" uuid null, "revoked_at" timestamptz null, "open_count" int not null default 0, "last_opened_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "report_shares_report_id_index" on "report_shares" ("report_id");`);
    this.addSql(`alter table "report_shares" add constraint "report_shares_token_unique" unique ("token");`);

    this.addSql(`alter table "report_shares" add constraint "report_shares_report_id_foreign" foreign key ("report_id") references "reports" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "report_shares" add constraint "report_shares_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_INSTAGRAM' after 'SCRAPE_TIKTOK';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "report_shares" cascade;`);
  }

}
