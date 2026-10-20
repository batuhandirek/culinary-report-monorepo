import { Migration } from '@mikro-orm/migrations';

export class Migration20261017193131 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "mention_match_method" add value if not exists 'manual' after 'other_city';`);
    this.addSql(`alter type "mention_match_method" add value if not exists 'ignored' after 'manual';`);
    this.addSql(`alter table "mentions" add "match_note" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "mentions" drop column "match_note";`);
  }

}
