import { Migration } from '@mikro-orm/migrations';

export class Migration20261018100454 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "venues" add "favicon_id" int null, add "favicon_hash" text null, add "favicon_checked_at" timestamptz null;`);
    this.addSql(`alter table "venues" add constraint "venues_favicon_id_foreign" foreign key ("favicon_id") references "images" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "venues_favicon_checked_at_index" on "venues" ("favicon_checked_at");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venues" drop constraint "venues_favicon_id_foreign";`);

    this.addSql(`drop index "venues_favicon_checked_at_index";`);
    this.addSql(`alter table "venues" drop column "favicon_id", drop column "favicon_hash", drop column "favicon_checked_at";`);
  }

}
