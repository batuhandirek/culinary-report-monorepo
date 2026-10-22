import { Migration } from '@mikro-orm/migrations';

export class Migration20261022191604 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "city_source_kind" add value if not exists 'blog' after 'instagram_hashtag';`);
    this.addSql(`alter table "city_sources" add "feed_url" text null, add "checked_at" timestamptz null, add "error" text null;`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_BLOGS' after 'SCRAPE_INSTAGRAM_REELS';`);

    this.addSql(`alter type "social_platform" add value if not exists 'blog' after 'instagram';`);

    this.addSql(`alter type "social_platform" add value if not exists 'blog' after 'instagram';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "city_sources" drop column "feed_url", drop column "checked_at", drop column "error";`);
  }

}
