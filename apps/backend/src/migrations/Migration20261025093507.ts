import { Migration } from '@mikro-orm/migrations';

export class Migration20261025093507 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'FIND_OWN_ACCOUNTS' after 'SCRAPE_ACCOUNTS_RECENT';`);

    this.addSql(`alter table "venues" add "site_profiles" jsonb null, add "site_profiles_at" timestamptz null;`);

    this.addSql(`alter type "account_brand_source" add value if not exists 'site' after 'website';`);
    this.addSql(`alter type "account_brand_source" add value if not exists 'profile' after 'site';`);
    this.addSql(`alter table "social_accounts" add "twin_checked_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "social_accounts" drop column "twin_checked_at";`);

    this.addSql(`alter table "venues" drop column "site_profiles", drop column "site_profiles_at";`);
  }

}
