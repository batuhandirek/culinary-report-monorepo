import { Migration } from '@mikro-orm/migrations';

export class Migration20261022222526 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "social_posts" drop column "source", drop column "hashtags";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "social_posts" add "source" text null, add "hashtags" jsonb null;`);
  }

}
