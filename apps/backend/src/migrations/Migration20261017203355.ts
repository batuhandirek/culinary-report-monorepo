import { Migration } from '@mikro-orm/migrations';

export class Migration20261017203355 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "venue_competitor_picked_by" as enum ('admin', 'owner', 'suggested');`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'WATCH_REVIEWS' after 'SCORE_LEADS';`);

    this.addSql(`alter table "google_reviews" add "marked_replied_at" timestamptz null, add "alerted_at" timestamptz null, add "reply_draft" text null;`);

    this.addSql(`alter table "venue_competitors" add "picked_by" "venue_competitor_picked_by" not null default 'admin';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "google_reviews" drop column "marked_replied_at", drop column "alerted_at", drop column "reply_draft";`);

    this.addSql(`alter table "venue_competitors" drop column "picked_by";`);

    this.addSql(`drop type "venue_competitor_picked_by";`);
  }

}
