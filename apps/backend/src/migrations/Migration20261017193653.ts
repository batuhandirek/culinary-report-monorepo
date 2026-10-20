import { Migration } from '@mikro-orm/migrations';

export class Migration20261017193653 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCORE_LEADS' after 'BUILD_REPORTS';`);

    this.addSql(`alter table "venues" add "lead_score" real null, add "lead_signals" jsonb null;`);
    this.addSql(`create index "venues_lead_score_index" on "venues" ("lead_score");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "venues_lead_score_index";`);
    this.addSql(`alter table "venues" drop column "lead_score", drop column "lead_signals";`);
  }

}
