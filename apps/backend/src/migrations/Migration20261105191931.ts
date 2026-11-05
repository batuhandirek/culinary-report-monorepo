import { Migration } from '@mikro-orm/migrations';

export class Migration20261105191931 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "statements" drop constraint "statements_venue_id_foreign";`);

    this.addSql(`drop index "statements_venue_id_source_kind_index";`);
    this.addSql(`alter table "statements" drop constraint "statements_one_source_check";`);
    this.addSql(`alter table "statements" drop column "venue_id", drop column "count";`);
    this.addSql(`alter table "statements" alter column "month" set not null;`);
    this.addSql(`alter table "statements" add constraint "statements_one_source_check" check ((review_id is not null)::int + (post_id is not null)::int + (comment_id is not null)::int + (web_mention_id is not null)::int = 1);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "statements" drop constraint "statements_one_source_check";`);
    this.addSql(`alter table "statements" add "venue_id" uuid null, add "count" int4 not null default 1;`);
    this.addSql(`alter table "statements" add constraint "statements_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "statements" alter column "month" drop not null;`);
    this.addSql(`create index "statements_venue_id_source_kind_index" on "statements" ("venue_id", "source_kind");`);
    this.addSql(`alter table "statements" add constraint "statements_one_source_check" check ((((((review_id IS NOT NULL) + (post_id IS NOT NULL)) + (comment_id IS NOT NULL)) + (web_mention_id IS NOT NULL)) + (venue_id IS NOT NULL)) = 1);`);
  }

}
