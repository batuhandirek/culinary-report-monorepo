import { Migration } from '@mikro-orm/migrations';

export class Migration20261018091252 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "blog_tags" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "name" text not null, "slug" text not null, primary key ("id"));`);
    this.addSql(`alter table "blog_tags" add constraint "blog_tags_slug_unique" unique ("slug");`);

    this.addSql(`create table "blog_entries" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "title" text not null, "slug" text not null, "excerpt" text null, "content" text not null, "content_html" text not null default '', "content_text" text not null default '', "state" text not null, "published_at" timestamptz null, "view_count" int not null default 0, "author_id" uuid null, "cover_image_id" int null, primary key ("id"));`);
    this.addSql(`alter table "blog_entries" add constraint "blog_entries_slug_unique" unique ("slug");`);
    this.addSql(`create index "blog_entries_state_published_at_index" on "blog_entries" ("state", "published_at");`);

    this.addSql(`create table "blog_entries_tags" ("blog_entry_id" uuid not null, "blog_tag_id" uuid not null, primary key ("blog_entry_id", "blog_tag_id"));`);

    this.addSql(`alter table "blog_entries" add constraint "blog_entries_author_id_foreign" foreign key ("author_id") references "users" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "blog_entries" add constraint "blog_entries_cover_image_id_foreign" foreign key ("cover_image_id") references "images" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "blog_entries" add constraint "blog_entries_state_check" check ("state" in ('DRAFT', 'PUBLISHED', 'REMOVED'));`);

    this.addSql(`alter table "blog_entries_tags" add constraint "blog_entries_tags_blog_entry_id_foreign" foreign key ("blog_entry_id") references "blog_entries" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "blog_entries_tags" add constraint "blog_entries_tags_blog_tag_id_foreign" foreign key ("blog_tag_id") references "blog_tags" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "blog_entries_tags" drop constraint "blog_entries_tags_blog_tag_id_foreign";`);
    this.addSql(`alter table "blog_entries_tags" drop constraint "blog_entries_tags_blog_entry_id_foreign";`);

    this.addSql(`drop table if exists "blog_tags" cascade;`);
    this.addSql(`drop table if exists "blog_entries" cascade;`);
    this.addSql(`drop table if exists "blog_entries_tags" cascade;`);
  }

}
