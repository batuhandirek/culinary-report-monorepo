import { Migration } from '@mikro-orm/migrations';

export class Migration20261017195033 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "venue_member_role" as enum ('OWNER', 'STAFF');`);
    this.addSql(`create table "venue_members" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "user_id" uuid not null, "venue_id" uuid not null, "role" "venue_member_role" not null default 'OWNER', "invited_by_id" uuid null, "accepted_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "venue_members_user_id_index" on "venue_members" ("user_id");`);
    this.addSql(`create index "venue_members_venue_id_index" on "venue_members" ("venue_id");`);
    this.addSql(`alter table "venue_members" add constraint "venue_members_user_id_venue_id_unique" unique ("user_id", "venue_id");`);

    this.addSql(`alter table "venue_members" add constraint "venue_members_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "venue_members" add constraint "venue_members_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "venue_members" add constraint "venue_members_invited_by_id_foreign" foreign key ("invited_by_id") references "users" ("id") on update cascade on delete set null;`);

    this.addSql(`alter type "user_role" add value if not exists 'venue_owner' after 'user';`);

    this.addSql(`alter table "credential_verification_requests" drop constraint "credential_verification_requests_type_check";`);
    this.addSql(`alter table "credential_verification_requests" add constraint "credential_verification_requests_type_check" check ("type" in ('SIGNUP_EMAIL', 'SIGNUP_MOBILE_NUMBER', 'CHANGE_EMAIL', 'CHANGE_MOBILE_NUMBER', 'FORGOT_PASSWORD', 'LOGIN_EMAIL'));`);

    this.addSql(`alter table "venues" add "details" jsonb null, add "details_at" timestamptz null;`);

    this.addSql(`alter table "reports" add "sent_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "venue_members" cascade;`);

    this.addSql(`alter table "credential_verification_requests" drop constraint "credential_verification_requests_type_check";`);
    this.addSql(`alter table "credential_verification_requests" add constraint "credential_verification_requests_type_check" check ("type" in ('SIGNUP_EMAIL', 'SIGNUP_MOBILE_NUMBER', 'CHANGE_EMAIL', 'CHANGE_MOBILE_NUMBER', 'FORGOT_PASSWORD'));`);

    this.addSql(`alter table "reports" drop column "sent_at";`);

    this.addSql(`alter table "venues" drop column "details", drop column "details_at";`);

    this.addSql(`drop type "venue_member_role";`);
  }

}
