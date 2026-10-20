import { Migration } from '@mikro-orm/migrations';

export class Migration20261017205052 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "venues" add "press_searched_at" timestamptz null, add "tripadvisor_url" text null, add "tripadvisor_searched_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venues" drop column "press_searched_at", drop column "tripadvisor_url", drop column "tripadvisor_searched_at";`);
  }

}
