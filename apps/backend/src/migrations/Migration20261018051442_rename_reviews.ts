import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (not generated): `google_reviews` becomes `reviews`, keeping its rows. The
 * generator sees a table rename as drop + create, which would lose every review.
 */
export class Migration20261018051442_rename_reviews extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`alter table "google_reviews" rename to "reviews";`);
		this.addSql(`alter table "reviews" rename constraint "google_reviews_pkey" to "reviews_pkey";`);
		this.addSql(`alter table "reviews" rename constraint "google_reviews_review_id_unique" to "reviews_review_id_unique";`);
		this.addSql(`alter table "reviews" rename constraint "google_reviews_venue_id_foreign" to "reviews_venue_id_foreign";`);
		this.addSql(`alter index "google_reviews_venue_id_published_at_index" rename to "reviews_venue_id_published_at_index";`);
	}

	override down(): void | Promise<void> {
		this.addSql(`alter index "reviews_venue_id_published_at_index" rename to "google_reviews_venue_id_published_at_index";`);
		this.addSql(`alter table "reviews" rename constraint "reviews_venue_id_foreign" to "google_reviews_venue_id_foreign";`);
		this.addSql(`alter table "reviews" rename constraint "reviews_review_id_unique" to "google_reviews_review_id_unique";`);
		this.addSql(`alter table "reviews" rename constraint "reviews_pkey" to "google_reviews_pkey";`);
		this.addSql(`alter table "reviews" rename to "google_reviews";`);
	}
}
