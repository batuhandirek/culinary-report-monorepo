import { Migration } from '@mikro-orm/migrations';

// Hand-written data migration: brands confirmed before `Venue.brandMain` existed get their main
// branch pinned, one per brand and city, as `mainBranch` picks it (open, most reviews, then id).
export class Migration20261018135800_pin_brand_main_branches extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`update venues set brand_main = true where id in (
			select distinct on (brand_id, city_id) id from venues
			where brand_id is not null and not closed and deleted_at is null
			order by brand_id, city_id, reviews_count desc nulls last, id
		) and not exists (
			select 1 from venues pinned
			where pinned.brand_id = venues.brand_id and pinned.city_id = venues.city_id and pinned.brand_main
		);`);
	}

	override down(): void | Promise<void> {
		this.addSql(`update venues set brand_main = false;`);
	}
}
