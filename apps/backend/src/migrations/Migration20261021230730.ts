import { Migration } from '@mikro-orm/migrations';

export class Migration20261021230730 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "city_highlights" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "city_id" uuid not null, "month" text not null, "data" jsonb not null, "built_at" timestamptz not null, "published_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "city_highlights" add constraint "city_highlights_city_id_month_unique" unique ("city_id", "month");`);

    this.addSql(`alter table "city_highlights" add constraint "city_highlights_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "cities" add "do_not_list_venues" jsonb not null default '[]', add "do_not_list_creators" jsonb not null default '[]';`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_TIKTOK_RECENT' after 'SCRAPE_TIKTOK';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_INSTAGRAM_REELS' after 'SCRAPE_INSTAGRAM_RECENT';`);

    this.addSql(`alter table "mentions" add "is_new_opening" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "city_highlights" cascade;`);

    this.addSql(`alter table "cities" drop column "do_not_list_venues", drop column "do_not_list_creators";`);

    this.addSql(`alter table "mentions" drop column "is_new_opening";`);
  }

}
