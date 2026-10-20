import { Migration } from '@mikro-orm/migrations';

export class Migration20261018194257 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "apify_runs" add "input_hash" text null, add "pipeline_run_id" uuid null, add "step_key" text null;`);
    this.addSql(`create index "apify_runs_pipeline_run_id_index" on "apify_runs" ("pipeline_run_id");`);

    this.addSql(`alter table "pipeline_runs" add "resumes" int not null default 0;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "apify_runs_pipeline_run_id_index";`);
    this.addSql(`alter table "apify_runs" drop column "input_hash", drop column "pipeline_run_id", drop column "step_key";`);

    this.addSql(`alter table "pipeline_runs" drop column "resumes";`);
  }

}
