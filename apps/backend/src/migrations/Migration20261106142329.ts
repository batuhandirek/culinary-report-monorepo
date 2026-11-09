import { Migration } from '@mikro-orm/migrations';

export class Migration20261106142329 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "llm_calls" add "account" text null;`);
    this.addSql(`create index "llm_calls_account_created_at_index" on "llm_calls" ("account", "created_at");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "llm_calls_account_created_at_index";`);
    this.addSql(`alter table "llm_calls" drop column "account";`);
  }

}
