import { Migration } from '@mikro-orm/migrations';

export class Migration20261024172410 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "report_config_status" as enum ('active', 'inactive');`);
    this.addSql(`create table "report_templates" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "name" text not null, "description" text null, "is_default" boolean not null default false, "sections" jsonb not null, primary key ("id"));`);
    this.addSql(`alter table "report_templates" add constraint "report_templates_name_unique" unique ("name");`);

    this.addSql(`create table "brand_report_configs" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "brand_id" uuid not null, "name" text not null, "template_id" uuid null, "status" "report_config_status" not null default 'active', "sections" jsonb not null, primary key ("id"));`);
    this.addSql(`create index "brand_report_configs_brand_id_index" on "brand_report_configs" ("brand_id");`);
    this.addSql(`alter table "brand_report_configs" add constraint "brand_report_configs_brand_id_name_unique" unique ("brand_id", "name");`);

    this.addSql(`alter table "brand_report_configs" add constraint "brand_report_configs_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "brand_report_configs" add constraint "brand_report_configs_template_id_foreign" foreign key ("template_id") references "report_templates" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "reports" drop constraint "reports_brand_id_city_id_month_unique";`);
    this.addSql(`alter table "reports" add "config_id" uuid null, add "template_id" uuid null, add "name" text not null default 'Full report', add "sections" jsonb not null default '[]';`);
    this.addSql(`alter table "reports" add constraint "reports_config_id_foreign" foreign key ("config_id") references "brand_report_configs" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "reports" add constraint "reports_template_id_foreign" foreign key ("template_id") references "report_templates" ("id") on update cascade on delete set null;`);
    this.addSql(`create index "reports_config_id_index" on "reports" ("config_id");`);
    this.addSql(`create index "reports_template_id_index" on "reports" ("template_id");`);
    this.addSql(`alter table "reports" add constraint "reports_brand_id_city_id_month_config_id_unique" unique ("brand_id", "city_id", "month", "config_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "brand_report_configs" drop constraint "brand_report_configs_template_id_foreign";`);
    this.addSql(`alter table "reports" drop constraint "reports_template_id_foreign";`);
    this.addSql(`alter table "reports" drop constraint "reports_config_id_foreign";`);

    this.addSql(`drop table if exists "report_templates" cascade;`);
    this.addSql(`drop table if exists "brand_report_configs" cascade;`);

    this.addSql(`drop index "reports_config_id_index";`);
    this.addSql(`drop index "reports_template_id_index";`);
    this.addSql(`alter table "reports" drop constraint "reports_brand_id_city_id_month_config_id_unique";`);
    this.addSql(`alter table "reports" drop column "config_id", drop column "template_id", drop column "name", drop column "sections";`);
    this.addSql(`alter table "reports" add constraint "reports_brand_id_city_id_month_unique" unique ("brand_id", "city_id", "month");`);

    this.addSql(`drop type "report_config_status";`);
  }

}
