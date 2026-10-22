import { Migration } from '@mikro-orm/migrations';

export class Migration20261021140906 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter type "pipeline_step" add value if not exists 'FILL_COMPETITORS' after 'SCRAPE_VENUE_SOCIAL';`);

    this.addSql(`alter table "venue_lookups" add "looked_up_at" timestamptz not null default now();`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "venue_lookups" drop column "looked_up_at";`);
  }

}
