import { Migration } from '@mikro-orm/migrations';

export class Migration20261022221707 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "post_source_kind" as enum ('tiktok_hashtag', 'tiktok_search', 'instagram_hashtag', 'blog', 'venue_search', 'venue_place');`);
    this.addSql(`create table "hashtags" ("id" serial primary key, "created_at" timestamptz not null default now(), "tag" text not null, "food_topic_id" uuid null, "brand_id" uuid null, "ignored" boolean not null default false);`);
    this.addSql(`alter table "hashtags" add constraint "hashtags_tag_unique" unique ("tag");`);
    this.addSql(`create index "hashtags_food_topic_id_index" on "hashtags" ("food_topic_id");`);
    this.addSql(`create index "hashtags_brand_id_index" on "hashtags" ("brand_id");`);

    this.addSql(`create table "post_hashtags" ("id" serial primary key, "created_at" timestamptz not null default now(), "post_id" uuid not null, "hashtag_id" int not null, "rank" int not null);`);
    this.addSql(`create index "post_hashtags_hashtag_id_index" on "post_hashtags" ("hashtag_id");`);
    this.addSql(`alter table "post_hashtags" add constraint "post_hashtags_post_id_hashtag_id_unique" unique ("post_id", "hashtag_id");`);

    this.addSql(`create table "post_sources" ("id" serial primary key, "created_at" timestamptz not null default now(), "post_id" uuid not null, "kind" "post_source_kind" not null, "value" text not null, "source_id" uuid null, "venue_id" uuid null, "found_at" timestamptz not null);`);
    this.addSql(`create index "post_sources_source_id_index" on "post_sources" ("source_id");`);
    this.addSql(`create index "post_sources_venue_id_index" on "post_sources" ("venue_id");`);
    this.addSql(`alter table "post_sources" add constraint "post_sources_post_id_kind_value_unique" unique ("post_id", "kind", "value");`);

    this.addSql(`alter table "hashtags" add constraint "hashtags_food_topic_id_foreign" foreign key ("food_topic_id") references "food_topics" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "hashtags" add constraint "hashtags_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "post_hashtags" add constraint "post_hashtags_post_id_foreign" foreign key ("post_id") references "social_posts" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "post_hashtags" add constraint "post_hashtags_hashtag_id_foreign" foreign key ("hashtag_id") references "hashtags" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "post_sources" add constraint "post_sources_post_id_foreign" foreign key ("post_id") references "social_posts" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "post_sources" add constraint "post_sources_source_id_foreign" foreign key ("source_id") references "city_sources" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "post_sources" add constraint "post_sources_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "city_sources" add "hashtag_id" int null;`);
    this.addSql(`alter table "city_sources" add constraint "city_sources_hashtag_id_foreign" foreign key ("hashtag_id") references "hashtags" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "city_sources_hashtag_id_index" on "city_sources" ("hashtag_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "city_sources" drop constraint "city_sources_hashtag_id_foreign";`);
    this.addSql(`alter table "post_hashtags" drop constraint "post_hashtags_hashtag_id_foreign";`);

    this.addSql(`drop table if exists "hashtags" cascade;`);
    this.addSql(`drop table if exists "post_hashtags" cascade;`);
    this.addSql(`drop table if exists "post_sources" cascade;`);

    this.addSql(`drop index "city_sources_hashtag_id_index";`);
    this.addSql(`alter table "city_sources" drop column "hashtag_id";`);

    this.addSql(`drop type "post_source_kind";`);
  }

}
