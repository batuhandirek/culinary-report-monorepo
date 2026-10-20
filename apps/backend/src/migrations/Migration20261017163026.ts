import { Migration } from '@mikro-orm/migrations';

export class Migration20261017163026 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "venue_competitors" ("id" serial primary key, "created_at" timestamptz not null default now(), "venue_id" uuid not null, "competitor_id" uuid not null);`);
    this.addSql(`create index "venue_competitors_competitor_id_index" on "venue_competitors" ("competitor_id");`);
    this.addSql(`alter table "venue_competitors" add constraint "venue_competitors_venue_id_competitor_id_unique" unique ("venue_id", "competitor_id");`);

    this.addSql(`alter table "venue_competitors" add constraint "venue_competitors_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "venue_competitors" add constraint "venue_competitors_competitor_id_foreign" foreign key ("competitor_id") references "venues" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "venue_competitors" cascade;`);
  }

}
