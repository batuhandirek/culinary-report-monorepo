import { Migration } from '@mikro-orm/migrations';

export class Migration20261023004248 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "feedback_points" add "change" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "feedback_points" drop column "change";`);
  }

}
