import { Migration } from '@mikro-orm/migrations';

export class Migration20261019174618 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "brands" drop column "ownership";`);

    this.addSql(`drop type "brand_ownership";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`create type "brand_ownership" as enum ('independent', 'corporate');`);
    this.addSql(`alter table "brands" add "ownership" "brand_ownership" null;`);
  }

}
