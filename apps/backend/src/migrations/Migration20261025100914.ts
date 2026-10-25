import { Migration } from '@mikro-orm/migrations';

export class Migration20261025100914 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'SNAPSHOT_RATINGS' after 'SAMPLE_RESERVATIONS';`);
  }

}
