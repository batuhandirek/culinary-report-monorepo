import { Migration } from '@mikro-orm/migrations';

export class Migration20261017210528 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'TRACK_SEARCH_RANKS' after 'SCRAPE_PRESS';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'SEARCH_INTEREST' after 'TRACK_SEARCH_RANKS';`);
  }

}
