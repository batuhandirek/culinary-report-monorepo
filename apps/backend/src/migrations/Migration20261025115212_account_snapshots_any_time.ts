import { Migration } from '@mikro-orm/migrations';

// Hand-written: the generated one adds not-null columns and casts `month` ('2026-09') to an int,
// both of which fail on stored rows. A snapshot is now one scrape at any time, so the unique
// account × month goes and the date parts come from `scraped_at`.
export class Migration20261025115212_account_snapshots_any_time extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "account_snapshot_source" as enum ('profile', 'lookup', 'post');`);
    this.addSql(`alter table "social_account_snapshots" drop constraint "social_account_snapshots_account_id_month_unique";`);
    this.addSql(`alter table "social_account_snapshots" add "year" int null, add "day" int null, add "source" "account_snapshot_source" null, add "following" int null;`);
    this.addSql(`alter table "social_account_snapshots" alter column "month" type int using (extract(month from "scraped_at" at time zone 'UTC')::int);`);
    this.addSql(`update "social_account_snapshots" set "year" = extract(year from "scraped_at" at time zone 'UTC')::int, "day" = extract(day from "scraped_at" at time zone 'UTC')::int, "source" = 'profile';`);
    this.addSql(`alter table "social_account_snapshots" alter column "year" set not null, alter column "day" set not null, alter column "source" set not null;`);
    this.addSql(`create index "social_account_snapshots_year_month_index" on "social_account_snapshots" ("year", "month");`);
    this.addSql(`create index "social_account_snapshots_account_id_scraped_at_index" on "social_account_snapshots" ("account_id", "scraped_at");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "social_account_snapshots_year_month_index";`);
    this.addSql(`drop index "social_account_snapshots_account_id_scraped_at_index";`);
    this.addSql(`alter table "social_account_snapshots" drop column "year", drop column "day", drop column "source", drop column "following";`);
    this.addSql(`alter table "social_account_snapshots" alter column "month" type text using (to_char("scraped_at" at time zone 'UTC' - interval '7 days', 'YYYY-MM'));`);
    this.addSql(`alter table "social_account_snapshots" add constraint "social_account_snapshots_account_id_month_unique" unique ("account_id", "month");`);
    this.addSql(`drop type "account_snapshot_source";`);
  }

}
