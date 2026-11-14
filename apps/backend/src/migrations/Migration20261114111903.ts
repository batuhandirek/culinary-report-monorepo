import { Migration } from '@mikro-orm/migrations';

export class Migration20261114111903 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "menu_item_snapshots" ("id" serial primary key, "created_at" timestamptz not null default now(), "menu_item_id" int not null, "month" text not null, "price" real not null, "liked_share" real null, "ratings_count" int null, "seen_at" timestamptz not null);`);
    this.addSql(`create index "menu_item_snapshots_month_index" on "menu_item_snapshots" ("month");`);
    this.addSql(`alter table "menu_item_snapshots" add constraint "menu_item_snapshots_menu_item_id_month_unique" unique ("menu_item_id", "month");`);

    this.addSql(`alter table "menu_item_snapshots" add constraint "menu_item_snapshots_menu_item_id_foreign" foreign key ("menu_item_id") references "menu_items" ("id") on update cascade on delete cascade;`);

    // Added by hand: the months kept in "prices" become rows before the column goes. Only an item's
    // latest month knows how raters liked it (the item held the latest alone)
    this.addSql(`insert into "menu_item_snapshots" ("menu_item_id", "month", "price", "liked_share", "ratings_count", "seen_at")
      select mi.id, p->>'month', (p->>'price')::real,
        case when p->>'month' = (select max(q->>'month') from jsonb_array_elements(mi.prices) q) then mi.liked_share end,
        case when p->>'month' = (select max(q->>'month') from jsonb_array_elements(mi.prices) q) then mi.ratings_count end,
        mi.last_seen_at
      from "menu_items" mi, jsonb_array_elements(mi.prices) p;`);
    this.addSql(`alter table "menu_items" drop column "prices";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "menu_item_snapshots" cascade;`);

    this.addSql(`alter table "menu_items" add "prices" jsonb not null default '[]';`);
  }

}
