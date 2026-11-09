import { Migration } from '@mikro-orm/migrations';

// Hand-written: a data fix. Google's review actor gives a stars-only review as text '' (not null),
// and the reading took every review whose text was not null, so ~27,000 stars-only reviews were
// queued for agent A; the ~2,800 it read gave 1,982 made-up claims ("top", "no review text
// provided"). `saveReviews` now stores blank text as null. This nulls the blank texts already
// stored and deletes every claim on a review without text (their parts cascade): agent A only
// ever read text, so none of them came from the review.
export class Migration20261109120000_drop_claims_of_textless_reviews extends Migration {
	override up(): void {
		this.addSql(`
			update reviews
			set text = nullif(btrim(text), ''), text_translated = nullif(btrim(text_translated), '')
			where btrim(text) = '' or btrim(text_translated) = '';
		`);
		this.addSql(`
			delete from statements s using reviews r
			where s.review_id = r.id and r.text is null and r.text_translated is null;
		`);
	}
}
