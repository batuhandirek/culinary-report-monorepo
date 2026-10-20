import { Migration } from '@mikro-orm/migrations';

export class Migration20261017204531 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "post_comment_intent" as enum ('intent', 'confirmation', 'disagreement', 'question', 'tag', 'other');`);
    this.addSql(`create type "post_comment_question_topic" as enum ('location', 'price', 'hours', 'menu', 'dietary', 'payment', 'reservation', 'other');`);
    this.addSql(`create type "venue_account_platform" as enum ('tiktok', 'instagram');`);
    this.addSql(`create type "venue_account_source" as enum ('detected', 'admin', 'prospect');`);
    this.addSql(`create type "web_mention_source" as enum ('news', 'web');`);
    this.addSql(`create type "web_mention_kind" as enum ('feature', 'listicle', 'passing', 'unrelated');`);
    this.addSql(`create table "post_comments" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "external_id" text not null, "post_id" uuid not null, "text" text not null, "likes" int not null default 0, "replies" int not null default 0, "commented_at" timestamptz null, "language" text null, "intent" "post_comment_intent" null, "question_topic" "post_comment_question_topic" null, "question" text null, "analysed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "post_comments" add constraint "post_comments_external_id_unique" unique ("external_id");`);
    this.addSql(`create index "post_comments_post_id_commented_at_index" on "post_comments" ("post_id", "commented_at");`);

    this.addSql(`create table "venue_accounts" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "venue_id" uuid not null, "platform" "venue_account_platform" not null, "handle" text not null, "source" "venue_account_source" not null, "ignored_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "venue_accounts" add constraint "venue_accounts_venue_id_platform_handle_unique" unique ("venue_id", "platform", "handle");`);

    this.addSql(`create table "venue_account_snapshots" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "account_id" uuid not null, "month" text not null, "followers" int null, "posts" int null, "avg_views" real null, "avg_likes" real null, "posts_last30days" int null, "scraped_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "venue_account_snapshots" add constraint "venue_account_snapshots_account_id_month_unique" unique ("account_id", "month");`);

    this.addSql(`create table "web_mentions" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "venue_id" uuid not null, "url" text not null, "outlet" text null, "title" text not null, "snippet" text null, "published_at" timestamptz null, "month" text not null, "source" "web_mention_source" not null, "kind" "web_mention_kind" null, "summary" text null, "analysed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "web_mentions" add constraint "web_mentions_url_unique" unique ("url");`);
    this.addSql(`create index "web_mentions_venue_id_month_index" on "web_mentions" ("venue_id", "month");`);

    this.addSql(`alter table "post_comments" add constraint "post_comments_post_id_foreign" foreign key ("post_id") references "social_posts" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venue_accounts" add constraint "venue_accounts_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "venue_account_snapshots" add constraint "venue_account_snapshots_account_id_foreign" foreign key ("account_id") references "venue_accounts" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "web_mentions" add constraint "web_mentions_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_OWN_ACCOUNTS' after 'REFRESH_VENUE_DETAILS';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_COMMENTS' after 'SCRAPE_OWN_ACCOUNTS';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'ANALYSE_COMMENTS' after 'SCRAPE_COMMENTS';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_PRESS' after 'ANALYSE_COMMENTS';`);

    this.addSql(`alter table "social_posts" add "comments_scraped_at" timestamptz null, add "comments_disagreement" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venue_account_snapshots" drop constraint "venue_account_snapshots_account_id_foreign";`);

    this.addSql(`drop table if exists "post_comments" cascade;`);
    this.addSql(`drop table if exists "venue_accounts" cascade;`);
    this.addSql(`drop table if exists "venue_account_snapshots" cascade;`);
    this.addSql(`drop table if exists "web_mentions" cascade;`);

    this.addSql(`alter table "social_posts" drop column "comments_scraped_at", drop column "comments_disagreement";`);

    this.addSql(`drop type "post_comment_intent";`);
    this.addSql(`drop type "post_comment_question_topic";`);
    this.addSql(`drop type "venue_account_platform";`);
    this.addSql(`drop type "venue_account_source";`);
    this.addSql(`drop type "web_mention_source";`);
    this.addSql(`drop type "web_mention_kind";`);
  }

}
