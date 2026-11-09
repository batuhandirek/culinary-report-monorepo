import { Migration } from '@mikro-orm/migrations';

export class Migration20261106211539 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "apify_runs" add "owner_workflow_id" text null;`);
    this.addSql(`create index "apify_runs_owner_workflow_id_index" on "apify_runs" ("owner_workflow_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "apify_runs_owner_workflow_id_index";`);
    this.addSql(`alter table "apify_runs" drop column "owner_workflow_id";`);
  }

}
