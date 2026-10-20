import { Migration } from '@mikro-orm/migrations';

export class Migration20261018112644 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_INSTAGRAM_RECENT' after 'SCRAPE_INSTAGRAM';`);
  }

}
