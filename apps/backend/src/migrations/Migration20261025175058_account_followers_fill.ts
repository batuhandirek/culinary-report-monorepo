import { Migration } from '@mikro-orm/migrations';

export class Migration20261025175058_account_followers_fill extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'FILL_ACCOUNT_FOLLOWERS' after 'SCRAPE_ACCOUNTS_RECENT';`);

    this.addSql(`alter table "social_accounts" add "followers_asked_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "social_accounts" drop column "followers_asked_at";`);
  }

}
