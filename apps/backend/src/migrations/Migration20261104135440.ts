import { Migration } from '@mikro-orm/migrations';

export class Migration20261104135440 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "venues" add "reviews_fetched_from" timestamptz null, add "reviews_fetched_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venues" drop column "reviews_fetched_from", drop column "reviews_fetched_at";`);
  }

}
