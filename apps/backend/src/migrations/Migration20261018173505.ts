import { Migration } from '@mikro-orm/migrations';

export class Migration20261018173505 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "brand_report_scope" as enum ('city', 'all');`);
    this.addSql(`alter table "brands" add "report_scope" "brand_report_scope" not null default 'city';`);

    this.addSql(`alter table "reports" alter column "city_id" drop not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "brands" drop column "report_scope";`);

    this.addSql(`alter table "reports" alter column "city_id" set not null;`);

    this.addSql(`drop type "brand_report_scope";`);
  }

}
