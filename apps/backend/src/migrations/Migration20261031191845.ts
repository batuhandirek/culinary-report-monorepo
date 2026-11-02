import { Migration } from '@mikro-orm/migrations';

export class Migration20261031191845 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "terms" add "grouped_at" timestamptz null;`);

    this.addSql(`alter type "topic_kind" add value if not exists 'ingredient' after 'meal';`);
    this.addSql(`alter table "topics" add "discovered_at" timestamptz null;`);

    this.addSql(`alter table "term_topics" add "relation" text not null default 'same';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "term_topics" drop column "relation";`);

    this.addSql(`alter table "terms" drop column "grouped_at";`);

    this.addSql(`alter table "topics" drop column "discovered_at";`);
  }

}
