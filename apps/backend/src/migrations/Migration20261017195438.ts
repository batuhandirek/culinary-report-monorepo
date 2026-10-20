import { Migration } from '@mikro-orm/migrations';

export class Migration20261017195438 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'REFRESH_VENUE_DETAILS' after 'ANALYSE_REVIEWS';`);
  }

}
