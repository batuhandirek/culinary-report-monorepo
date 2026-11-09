import { Migration } from '@mikro-orm/migrations';

export class Migration20261106073645 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "llm_calls" alter column "usd" type double precision using ("usd"::double precision);`);

    this.addSql(`alter table "provider_credit_snapshots" alter column "limit_usd" type double precision using ("limit_usd"::double precision);`);
    this.addSql(`alter table "provider_credit_snapshots" alter column "used_usd" type double precision using ("used_usd"::double precision);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "llm_calls" alter column "usd" type float4 using ("usd"::float4);`);

    this.addSql(`alter table "provider_credit_snapshots" alter column "limit_usd" type float4 using ("limit_usd"::float4);`);
    this.addSql(`alter table "provider_credit_snapshots" alter column "used_usd" type float4 using ("used_usd"::float4);`);
  }

}
