import { Migration } from '@mikro-orm/migrations';

export class Migration20261025122225_report_analysis extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "reports" add "analysis" jsonb null;`);

  }

  override down(): void | Promise<void> {

    this.addSql(`alter table "reports" drop column "analysis";`);
  }

}
