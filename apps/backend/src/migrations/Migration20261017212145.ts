import { Migration } from '@mikro-orm/migrations';

export class Migration20261017212145 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "venues" add "booking_url" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venues" drop column "booking_url";`);
  }

}
