import { Migration } from '@mikro-orm/migrations';

export class Migration20261029193334 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "venue_delivery_snapshots" ("id" serial primary key, "created_at" timestamptz not null default now(), "listing_id" uuid not null, "month" text not null, "rating" real null, "reviews_count" int null, "delivery_fee" real null, "min_order" real null, "fetched_at" timestamptz not null);`);
    this.addSql(`alter table "venue_delivery_snapshots" add constraint "venue_delivery_snapshots_listing_id_month_unique" unique ("listing_id", "month");`);

    this.addSql(`alter table "venue_delivery_snapshots" add constraint "venue_delivery_snapshots_listing_id_foreign" foreign key ("listing_id") references "venue_delivery_listings" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "venue_delivery_snapshots" cascade;`);
  }

}
