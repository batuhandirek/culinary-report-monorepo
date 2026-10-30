import { Migration } from '@mikro-orm/migrations';

// Hand-written: the listings scraped before `venue_delivery_snapshots` existed become their first
// snapshot, under the month of the `SCRAPE_DELIVERY` run that wrote them (else the month before
// the scrape, the month a run on the following month's schedule is for).
export class Migration20261029200000_delivery_snapshots_fill extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`
			insert into "venue_delivery_snapshots"
				("listing_id", "month", "rating", "reviews_count", "delivery_fee", "min_order", "fetched_at")
			select l."id",
				coalesce(
					(select r."month" from "pipeline_runs" r
						where r."step" = 'SCRAPE_DELIVERY' and r."status" = 'SUCCEEDED'
							and l."fetched_at" between r."started_at" and r."finished_at"
						order by r."started_at" desc limit 1),
					to_char(l."fetched_at" - interval '1 month', 'YYYY-MM')
				),
				l."rating", l."reviews_count", l."delivery_fee", l."min_order", l."fetched_at"
			from "venue_delivery_listings" l
			on conflict ("listing_id", "month") do nothing;
		`);
	}

	override down(): void | Promise<void> {}
}
