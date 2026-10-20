import { Migration } from '@mikro-orm/migrations';

export class Migration20261018135735 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "venues" add "brand_main" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venues" drop column "brand_main";`);
  }

}
