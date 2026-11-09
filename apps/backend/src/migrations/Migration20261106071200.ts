import { Migration } from '@mikro-orm/migrations';

export class Migration20261106071200 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "llm_call_kind" as enum ('generate', 'decide', 'embed');`);
    this.addSql(`create type "spend_provider" as enum ('apify', 'openai', 'anthropic', 'openrouter', 'typesafe');`);
    this.addSql(`create type "credit_snapshot_source" as enum ('api', 'manual');`);
    this.addSql(`create table "llm_calls" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "kind" "llm_call_kind" not null, "agent_id" text not null, "model" text null, "provider" "spend_provider" null, "input_tokens" int not null default 0, "output_tokens" int not null default 0, "cached_input_tokens" int not null default 0, "cache_write_tokens" int not null default 0, "usd" real not null default 0, "duration_ms" int null, "ok" boolean not null default true, "error" text null, "workflow_id" text null, "city_id" uuid null, "purpose" text null, primary key ("id"));`);
    this.addSql(`create index "llm_calls_agent_id_index" on "llm_calls" ("agent_id");`);
    this.addSql(`create index "llm_calls_provider_index" on "llm_calls" ("provider");`);
    this.addSql(`create index "llm_calls_workflow_id_index" on "llm_calls" ("workflow_id");`);
    this.addSql(`create index "llm_calls_city_id_index" on "llm_calls" ("city_id");`);
    this.addSql(`create index "llm_calls_purpose_index" on "llm_calls" ("purpose");`);
    this.addSql(`create index "llm_calls_created_at_index" on "llm_calls" ("created_at");`);

    this.addSql(`create table "provider_credit_snapshots" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "provider" "spend_provider" not null, "at" timestamptz not null, "limit_usd" real not null, "used_usd" real not null, "cycle_start" timestamptz null, "cycle_end" timestamptz null, "source" "credit_snapshot_source" not null, "note" text null, primary key ("id"));`);
    this.addSql(`create index "provider_credit_snapshots_provider_at_index" on "provider_credit_snapshots" ("provider", "at");`);

    this.addSql(`alter table "llm_calls" add constraint "llm_calls_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "apify_runs" add "workflow_id" text null, add "workflow_step_id" int null;`);
    this.addSql(`create index "apify_runs_workflow_id_index" on "apify_runs" ("workflow_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "llm_calls" cascade;`);
    this.addSql(`drop table if exists "provider_credit_snapshots" cascade;`);

    this.addSql(`drop index "apify_runs_workflow_id_index";`);
    this.addSql(`alter table "apify_runs" drop column "workflow_id", drop column "workflow_step_id";`);

    this.addSql(`drop type "llm_call_kind";`);
    this.addSql(`drop type "spend_provider";`);
    this.addSql(`drop type "credit_snapshot_source";`);
  }

}
