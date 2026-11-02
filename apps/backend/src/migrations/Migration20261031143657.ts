import { Migration } from '@mikro-orm/migrations';

export class Migration20261031143657 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "post_skip_reason" as enum ('no_content', 'not_food', 'home_cooking', 'groceries', 'outdoors', 'other_city');`);
    this.addSql(`alter table "social_posts" add "skip_reason" "post_skip_reason" null, add "gated_at" timestamptz null;`);

    this.addSql(`alter table "mentions" add "unconfirmed_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "mentions" drop column "unconfirmed_at";`);

    this.addSql(`alter table "social_posts" drop column "skip_reason", drop column "gated_at";`);

    this.addSql(`drop type "post_skip_reason";`);
  }

}
