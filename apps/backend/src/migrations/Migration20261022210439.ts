import { Migration } from '@mikro-orm/migrations';

export class Migration20261022210439 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "reviews" drop column "praise", drop column "complaints", drop column "dishes";`);

    this.addSql(`alter table "mentions" drop column "dishes", drop column "praise", drop column "complaints";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "mentions" add "dishes" jsonb null, add "praise" jsonb null, add "complaints" jsonb null;`);

    this.addSql(`alter table "reviews" add "praise" jsonb null, add "complaints" jsonb null, add "dishes" jsonb null;`);
  }

}
