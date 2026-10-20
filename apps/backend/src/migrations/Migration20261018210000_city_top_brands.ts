import { Migration } from '@mikro-orm/migrations';

// Written by hand (the generator would drop and add the column): `cities.top_venues` counts
// brands since `brand_as_unit`, so it is `top_brands`.
export class Migration20261018210000_city_top_brands extends Migration {
	override up(): void {
		this.addSql(`alter table "cities" rename column "top_venues" to "top_brands";`);
	}

	override down(): void {
		this.addSql(`alter table "cities" rename column "top_brands" to "top_venues";`);
	}
}
