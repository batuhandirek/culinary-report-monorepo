import { Migration } from '@mikro-orm/migrations';

export class Migration20261017201605 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "pipeline_runs" drop constraint "pipeline_runs_city_id_foreign";`);

    this.addSql(`alter table "social_posts" drop constraint "social_posts_city_id_foreign";`);

    this.addSql(`alter table "venues" drop constraint "venues_city_id_foreign";`);

    this.addSql(`alter table "venue_lookups" drop constraint "venue_lookups_city_id_foreign";`);

    this.addSql(`alter table "pipeline_runs" alter column "city_id" set not null;`);
    this.addSql(`alter table "pipeline_runs" add constraint "pipeline_runs_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade;`);

    this.addSql(`alter table "social_posts" alter column "city_id" set not null;`);
    this.addSql(`alter table "social_posts" add constraint "social_posts_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade;`);

    this.addSql(`alter table "venues" alter column "city_id" set not null;`);
    this.addSql(`alter table "venues" add constraint "venues_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade;`);

    this.addSql(`alter table "venue_lookups" alter column "city_id" set not null;`);
    this.addSql(`alter table "venue_lookups" add constraint "venue_lookups_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "pipeline_runs" drop constraint "pipeline_runs_city_id_foreign";`);

    this.addSql(`alter table "social_posts" drop constraint "social_posts_city_id_foreign";`);

    this.addSql(`alter table "venue_lookups" drop constraint "venue_lookups_city_id_foreign";`);

    this.addSql(`alter table "venues" drop constraint "venues_city_id_foreign";`);

    this.addSql(`alter table "pipeline_runs" alter column "city_id" drop not null;`);
    this.addSql(`alter table "pipeline_runs" add constraint "pipeline_runs_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "social_posts" alter column "city_id" drop not null;`);
    this.addSql(`alter table "social_posts" add constraint "social_posts_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "venue_lookups" alter column "city_id" drop not null;`);
    this.addSql(`alter table "venue_lookups" add constraint "venue_lookups_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "venues" alter column "city_id" drop not null;`);
    this.addSql(`alter table "venues" add constraint "venues_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete set null;`);
  }

}
