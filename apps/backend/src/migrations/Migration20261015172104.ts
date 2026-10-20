import { Migration } from '@mikro-orm/migrations';

export class Migration20261015172104 extends Migration {

  override up(): void | Promise<void> {
    // The embeddings table stores pgvector `halfvec` columns
    this.addSql(`create extension if not exists vector;`);
    this.addSql(`create type "user_role" as enum ('system', 'admin', 'promoter', 'user');`);
    this.addSql(`create type "user_session_platform" as enum ('web', 'android', 'ios');`);
    this.addSql(`create table "embeddings" ("id" serial primary key, "created_at" timestamptz not null default now(), "input" text not null, "embedding" halfvec not null, "model" text not null, "dimensions" int not null, "tokens_used" int not null);`);
    this.addSql(`create index "embeddings_input_index" on "embeddings" ("input");`);
    this.addSql(`alter table "embeddings" add constraint "embeddings_input_unique" unique ("input");`);

    this.addSql(`create table "fsm_state_changes" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "fsm_name" text not null, "fsm_version" int not null, "owner_type" text not null, "owner_id" uuid not null, "turn_id" uuid not null, "turn_step" int not null default 0, "from_state" text not null, "to_state" text not null, "action" text not null, "params" jsonb null, "kind" text not null, primary key ("id"));`);
    this.addSql(`create index "fsm_state_changes_turn_id_index" on "fsm_state_changes" ("turn_id");`);
    this.addSql(`create index "fsm_state_changes_owner_id_created_at_index" on "fsm_state_changes" ("owner_id", "created_at");`);
    this.addSql(`create index "fsm_state_changes_owner_type_owner_id_created_at_index" on "fsm_state_changes" ("owner_type", "owner_id", "created_at");`);

    this.addSql(`create table "images" ("id" serial primary key, "created_at" timestamptz not null default now(), "remote_id" text not null, "width" int not null, "height" int not null, "aspect_ratio" double precision not null, "path" text not null, "url" text not null, "file_name" text not null, "file_type" text not null, "file_size" int not null, "media_type" text not null default 'IMAGE', "duration" double precision null);`);

    this.addSql(`create table "users" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "first_name" text not null, "last_name" text not null, "description" text null, "email" text null, "email_verified_at" timestamptz null, "mobile_number" text null, "mobile_number_verified_at" timestamptz null, "hashed_password" text null, "password_last_changed_at" timestamptz null, "is_marked_for_deletion" boolean null default false, "marked_for_deletion_at" timestamptz null, "accepted_marketing" boolean null default false, "accepted_call_communications" boolean null default false, "accepted_email_communications" boolean null default true, "accepted_sms_communications" boolean null default false, "roles" "user_role"[] not null, "profile_image_id" int null, primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);
    this.addSql(`alter table "users" add constraint "users_mobile_number_unique" unique ("mobile_number");`);
    this.addSql(`alter table "users" add constraint "users_profile_image_id_unique" unique ("profile_image_id");`);

    this.addSql(`create table "user_notification_preferences" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "user_id" uuid not null, "topic" text not null, "channel" text not null, "enabled" boolean not null, primary key ("id"));`);
    this.addSql(`alter table "user_notification_preferences" add constraint "user_notification_preferences_user_id_topic_channel_unique" unique ("user_id", "topic", "channel");`);

    this.addSql(`create table "notifications" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "type" text not null, "title" text null, "description" text null, "path" text null, "read_at" timestamptz null, "user_id" uuid not null, primary key ("id"));`);

    this.addSql(`create table "credential_verification_requests" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "type" text not null, "email" text null, "hashed_password" text null, "mobile_number" text null, "identifier" text not null, "code" varchar(6) not null, "expires_at" timestamptz not null, "verified_at" timestamptz null, "last_sent_at" timestamptz not null default now(), "send_count" int not null default 1, "visitor_info" jsonb not null, "signup_info" jsonb null, "user_id" uuid null, primary key ("id"));`);

    this.addSql(`create table "user_sessions" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "expires_at" timestamptz not null, "user_id" uuid not null, "visitor_info" jsonb not null, "platform" "user_session_platform" null, "last_seen_at" timestamptz null, primary key ("id"));`);

    this.addSql(`alter table "images" add constraint "images_media_type_check" check ("media_type" in ('IMAGE', 'VIDEO'));`);

    this.addSql(`alter table "users" add constraint "users_profile_image_id_foreign" foreign key ("profile_image_id") references "images" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "user_notification_preferences" add constraint "user_notification_preferences_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "notifications" add constraint "notifications_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "notifications" add constraint "notifications_type_check" check ("type" in ('GENERAL'));`);

    this.addSql(`alter table "credential_verification_requests" add constraint "credential_verification_requests_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "credential_verification_requests" add constraint "credential_verification_requests_type_check" check ("type" in ('SIGNUP_EMAIL', 'SIGNUP_MOBILE_NUMBER', 'CHANGE_EMAIL', 'CHANGE_MOBILE_NUMBER', 'FORGOT_PASSWORD'));`);

    this.addSql(`alter table "user_sessions" add constraint "user_sessions_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "users" drop constraint "users_profile_image_id_foreign";`);
    this.addSql(`alter table "user_notification_preferences" drop constraint "user_notification_preferences_user_id_foreign";`);
    this.addSql(`alter table "notifications" drop constraint "notifications_user_id_foreign";`);
    this.addSql(`alter table "credential_verification_requests" drop constraint "credential_verification_requests_user_id_foreign";`);
    this.addSql(`alter table "user_sessions" drop constraint "user_sessions_user_id_foreign";`);

    this.addSql(`drop table if exists "embeddings" cascade;`);
    this.addSql(`drop table if exists "fsm_state_changes" cascade;`);
    this.addSql(`drop table if exists "images" cascade;`);
    this.addSql(`drop table if exists "users" cascade;`);
    this.addSql(`drop table if exists "user_notification_preferences" cascade;`);
    this.addSql(`drop table if exists "notifications" cascade;`);
    this.addSql(`drop table if exists "credential_verification_requests" cascade;`);
    this.addSql(`drop table if exists "user_sessions" cascade;`);

    this.addSql(`drop type "user_role";`);
    this.addSql(`drop type "user_session_platform";`);
  }

}
