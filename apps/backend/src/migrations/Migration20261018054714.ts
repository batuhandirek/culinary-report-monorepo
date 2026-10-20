import { Migration } from '@mikro-orm/migrations';

export class Migration20261018054714 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "venues" add "reservation_partner" text null;`);

    this.addSql(`alter type "reservation_platform" add value if not exists 'google' after 'opentable';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venues" drop column "reservation_partner";`);
  }

}
