import { Migration } from '@mikro-orm/migrations';

export class Migration20261106121546 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "apify_runs" add "items" jsonb null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "apify_runs" drop column "items";`);
  }

}
