import { Migration } from '@mikro-orm/migrations';

export class Migration20261022111828 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "food_trends_reports" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "city_id" uuid not null, "quarter" text not null, "data" jsonb null, "built_at" timestamptz null, "published_at" timestamptz null, "search_levels" jsonb null, "search_pull" jsonb null, primary key ("id"));`);
    this.addSql(`alter table "food_trends_reports" add constraint "food_trends_reports_city_id_quarter_unique" unique ("city_id", "quarter");`);

    this.addSql(`alter table "food_trends_reports" add constraint "food_trends_reports_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "food_trends_reports" cascade;`);
  }

}
