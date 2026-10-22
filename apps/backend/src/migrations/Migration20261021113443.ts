import { Migration } from '@mikro-orm/migrations';

export class Migration20261021113443 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "osm_places" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "city_id" uuid not null, "osm_key" text not null, "name" text not null, "kind" text not null, "lat" double precision not null, "lng" double precision not null, "street" text null, "house_number" text null, "postal_code" text null, "tags" jsonb not null, "seen_at" timestamptz not null, "venue_id" uuid null, "looked_up_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "osm_places_city_id_index" on "osm_places" ("city_id");`);
    this.addSql(`alter table "osm_places" add constraint "osm_places_osm_key_unique" unique ("osm_key");`);
    this.addSql(`create index "osm_places_venue_id_index" on "osm_places" ("venue_id");`);

    this.addSql(`alter table "osm_places" add constraint "osm_places_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade;`);
    this.addSql(`alter table "osm_places" add constraint "osm_places_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "cities" add "osm_relation_id" int null, add "osm_places_synced_at" timestamptz null;`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'SYNC_OSM_PLACES' after 'SEARCH_BRANCHES';`);
    this.addSql(`alter type "pipeline_step" add value if not exists 'LOOKUP_OSM_PLACES' after 'SYNC_OSM_PLACES';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "osm_places" cascade;`);

    this.addSql(`alter table "cities" drop column "osm_relation_id", drop column "osm_places_synced_at";`);
  }

}
