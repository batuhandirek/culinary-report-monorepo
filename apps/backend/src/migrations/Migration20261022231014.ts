import { Migration } from '@mikro-orm/migrations';

export class Migration20261022231014 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "outreach_touches" add "report_id" uuid null, add "share_id" uuid null;`);
    this.addSql(`alter table "outreach_touches" add constraint "outreach_touches_report_id_foreign" foreign key ("report_id") references "reports" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "outreach_touches" add constraint "outreach_touches_share_id_foreign" foreign key ("share_id") references "report_shares" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "outreach_touches_report_id_index" on "outreach_touches" ("report_id");`);
    this.addSql(`create index "outreach_touches_share_id_index" on "outreach_touches" ("share_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "outreach_touches" drop constraint "outreach_touches_report_id_foreign";`);
    this.addSql(`alter table "outreach_touches" drop constraint "outreach_touches_share_id_foreign";`);

    this.addSql(`drop index "outreach_touches_report_id_index";`);
    this.addSql(`drop index "outreach_touches_share_id_index";`);
    this.addSql(`alter table "outreach_touches" drop column "report_id", drop column "share_id";`);
  }

}
