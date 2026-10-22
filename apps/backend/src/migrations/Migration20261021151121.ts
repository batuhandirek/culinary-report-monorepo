import { Migration } from '@mikro-orm/migrations';

export class Migration20261021151121 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create type "outreach_touch_outcome" as enum ('spoke_to_owner', 'spoke_to_staff', 'closed', 'nobody');`);
    this.addSql(`alter table "prospects" add "email_consent_at" timestamptz null;`);

    this.addSql(`alter table "outreach_touches" add "outcome" "outreach_touch_outcome" null, add "come_back_at" timestamptz null, add "email_consent" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "outreach_touches" drop column "outcome", drop column "come_back_at", drop column "email_consent";`);

    this.addSql(`alter table "prospects" drop column "email_consent_at";`);

    this.addSql(`drop type "outreach_touch_outcome";`);
  }

}
