import { Migration } from '@mikro-orm/migrations';

export class Migration20261105145205 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'READ_TAGGED_PROFILES' after 'FIND_OWN_ACCOUNTS';`);

    this.addSql(`alter type "account_brand_source" add value if not exists 'bio' after 'profile';`);
    this.addSql(`alter table "social_accounts" add "bio" text null, add "bio_links" jsonb null, add "business_category" text null, add "is_business" boolean null, add "profile_read_at" timestamptz null;`);

    this.addSql(`alter type "mention_match_method" add value if not exists 'account' after 'llm';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "social_accounts" drop column "bio", drop column "bio_links", drop column "business_category", drop column "is_business", drop column "profile_read_at";`);
  }

}
