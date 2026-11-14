import { Migration } from '@mikro-orm/migrations';

export class Migration20261114115530 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "venue_scrape_source" add value if not exists 'reviews' after 'details';`);
  }

}
