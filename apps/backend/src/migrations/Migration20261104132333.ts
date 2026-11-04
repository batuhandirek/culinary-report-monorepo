import { Migration } from '@mikro-orm/migrations';

export class Migration20261104132333 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'TRACK_PROFILES' after 'FILL_ACCOUNT_FOLLOWERS';`);
    this.addSql(`alter type "pipeline_run_status" add value if not exists 'WAITING' after 'RUNNING';`);
    this.addSql(`alter table "pipeline_runs" add "waiting_since" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "pipeline_runs" drop column "waiting_since";`);
  }

}
