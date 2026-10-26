import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (not generated): the counts stored posts already have get a read time and a
 * first snapshot, so the daily refresh pays only for posts no scrape read at seven days. Until now
 * every find overwrote the counts and no read time was kept: it is taken as the last time a new
 * source found the post (`post_sources.found_at`), else its creation. That is never later than
 * the real last read, so a post may be read once more, never kept on a young read.
 */
export class Migration20261025113431_post_counts extends Migration {
	override up(): void | Promise<void> {
		this.addSql(
			`update "social_posts" p set "counts_at" = greatest(p."created_at", (select max(s."found_at") from "post_sources" s where s."post_id" = p."id"))
			where p."platform" <> 'blog';`,
		);
		this.addSql(
			`update "social_posts" set "counts_final_at" = "counts_at"
			where "counts_at" is not null and "counts_at" >= "posted_at" + interval '7 days';`,
		);
		this.addSql(
			`insert into "social_post_snapshots" ("post_id", "at", "views", "likes", "shares", "comments", "saves")
			select "id", "counts_at", "views", "likes", "shares", "comments", "saves" from "social_posts" where "counts_at" is not null;`,
		);
	}

	override down(): void | Promise<void> {
		this.addSql(`delete from "social_post_snapshots";`);
		this.addSql(`update "social_posts" set "counts_at" = null, "counts_final_at" = null;`);
	}
}
