import { Migration } from '@mikro-orm/migrations';

export class Migration20261104203707 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_VENUE_SOCIAL_RECENT' after 'SCRAPE_VENUE_SOCIAL';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'BACKFILL_REVIEWS' after 'SCRAPE_REVIEWS';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_CREATORS' after 'SCRAPE_ACCOUNTS_RECENT';`);
  }

}
