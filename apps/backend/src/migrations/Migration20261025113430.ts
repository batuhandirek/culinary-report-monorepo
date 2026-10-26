import { Migration } from '@mikro-orm/migrations';

export class Migration20261025113430 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "social_post_snapshots" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "post_id" uuid not null, "at" timestamptz not null, "views" int not null default 0, "likes" int not null default 0, "shares" int not null default 0, "comments" int not null default 0, "saves" int not null default 0, primary key ("id"));`);
    this.addSql(`create index "social_post_snapshots_post_id_at_index" on "social_post_snapshots" ("post_id", "at");`);

    this.addSql(`alter table "social_post_snapshots" add constraint "social_post_snapshots_post_id_foreign" foreign key ("post_id") references "social_posts" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter type "pipeline_step" add value if not exists 'REFRESH_POST_COUNTS' after 'SCRAPE_DELIVERY';`);

    this.addSql(`alter table "social_posts" add "counts_at" timestamptz null, add "counts_final_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "social_post_snapshots" cascade;`);

    this.addSql(`alter table "social_posts" drop column "counts_at", drop column "counts_final_at";`);
  }

}
