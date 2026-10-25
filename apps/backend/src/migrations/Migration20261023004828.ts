import { Migration } from '@mikro-orm/migrations';

export class Migration20261023004828 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "reviews" drop column "changes";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "reviews" add "changes" jsonb null;`);
  }

}
