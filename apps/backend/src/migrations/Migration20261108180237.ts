import { Migration } from '@mikro-orm/migrations';

export class Migration20261108180237 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "reviews" drop column "reply_draft";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "reviews" add "reply_draft" text null;`);
  }

}
