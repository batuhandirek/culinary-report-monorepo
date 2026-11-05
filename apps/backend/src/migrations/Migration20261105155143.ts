import { Migration } from '@mikro-orm/migrations';

export class Migration20261105155143 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "social_accounts" add "places_searched_at" timestamptz null, add "place_asked_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "social_accounts" drop column "places_searched_at", drop column "place_asked_at";`);
  }

}
