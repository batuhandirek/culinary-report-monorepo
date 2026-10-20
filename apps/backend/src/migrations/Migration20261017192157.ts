import { Migration } from '@mikro-orm/migrations';

export class Migration20261017192157 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "prospect_stage" as enum ('TO_CONTACT', 'CONTACTED', 'REPLIED', 'MEETING', 'WON', 'LOST', 'OPTED_OUT');`);
    this.addSql(`create type "outreach_touch_kind" as enum ('EMAIL', 'DM', 'CALL', 'VISIT', 'REPLY', 'NOTE', 'STAGE');`);
    this.addSql(`create table "prospects" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "venue_id" uuid not null, "stage" "prospect_stage" not null default 'TO_CONTACT', "language" text not null default 'en', "contact_name" text null, "contact_email" text null, "instagram" text null, "hook" text null, "notes" text null, "next_follow_up_at" timestamptz null, "last_touch_at" timestamptz null, "outreach_count" int not null default 0, primary key ("id"));`);
    this.addSql(`alter table "prospects" add constraint "prospects_venue_id_unique" unique ("venue_id");`);
    this.addSql(`create index "prospects_stage_index" on "prospects" ("stage");`);
    this.addSql(`create index "prospects_next_follow_up_at_index" on "prospects" ("next_follow_up_at");`);

    this.addSql(`create table "outreach_touches" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "prospect_id" uuid not null, "kind" "outreach_touch_kind" not null, "at" timestamptz not null, "subject" text null, "body" text null, "template" text null, "stage" text null, primary key ("id"));`);
    this.addSql(`create index "outreach_touches_prospect_id_index" on "outreach_touches" ("prospect_id");`);

    this.addSql(`alter table "prospects" add constraint "prospects_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "outreach_touches" add constraint "outreach_touches_prospect_id_foreign" foreign key ("prospect_id") references "prospects" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "outreach_touches" add constraint "outreach_touches_stage_check" check ("stage" in ('TO_CONTACT', 'CONTACTED', 'REPLIED', 'MEETING', 'WON', 'LOST', 'OPTED_OUT'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "outreach_touches" drop constraint "outreach_touches_prospect_id_foreign";`);

    this.addSql(`drop table if exists "prospects" cascade;`);
    this.addSql(`drop table if exists "outreach_touches" cascade;`);

    this.addSql(`drop type "prospect_stage";`);
    this.addSql(`drop type "outreach_touch_kind";`);
  }

}
