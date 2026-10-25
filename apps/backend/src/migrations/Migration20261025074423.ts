import { Migration } from '@mikro-orm/migrations';

export class Migration20261025074423 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "landing_editions" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "city_id" uuid not null, "window_start" timestamptz not null, "window_end" timestamptz not null, "data" jsonb not null, "copy" jsonb not null, "copy_error" text null, "built_at" timestamptz not null, "published_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "landing_editions_city_id_published_at_index" on "landing_editions" ("city_id", "published_at");`);
    this.addSql(`alter table "landing_editions" add constraint "landing_editions_city_id_window_end_unique" unique ("city_id", "window_end");`);

    this.addSql(`create table "newsletter_subscribers" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "email" text not null, "city_id" uuid not null, "token" text not null, "consented_at" timestamptz not null, "consent_text" text not null, "confirm_mail_sent_at" timestamptz null, "confirmed_at" timestamptz null, "unsubscribed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "newsletter_subscribers" add constraint "newsletter_subscribers_token_unique" unique ("token");`);
    this.addSql(`alter table "newsletter_subscribers" add constraint "newsletter_subscribers_email_city_id_unique" unique ("email", "city_id");`);

    this.addSql(`alter table "landing_editions" add constraint "landing_editions_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "newsletter_subscribers" add constraint "newsletter_subscribers_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "landing_editions" cascade;`);
    this.addSql(`drop table if exists "newsletter_subscribers" cascade;`);
  }

}
