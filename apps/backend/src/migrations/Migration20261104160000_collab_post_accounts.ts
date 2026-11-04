import { Migration } from '@mikro-orm/migrations';

// Hand-written, one-off: the Instagram profile scrape gave every post on a profile's grid the
// profile's display name and followers, so a collab post's owner (another account) was saved with
// the brand profile's name and count, and the account matcher then linked it to that brand by the
// name (dev Berlin, 2026-11-02: 26 accounts, 19 linked). The mapper is fixed; this repairs the rows.
//
// An account is hit when a post of it was found on another Instagram profile and it carries that
// profile's display name. For each: the post snapshots holding the profile's count go, its own
// latest remaining count (or none) and no display name are kept (its next sighting fills it), its
// posts lose the copied count, a creator named after the profile by it alone takes the handle, and
// a link the matcher made by handle is dropped (a link from a website, a profile proof, outreach or
// an admin stays). Running it on data already repaired changes nothing.

export class Migration20261104160000_collab_post_accounts extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`
			create temporary table "_copied_profile_accounts" on commit drop as
			select distinct a."id" as "account_id", src."followers" as "src_followers", src."display_name" as "src_name"
			from "post_sources" ps
			join "social_posts" p on p."id" = ps."post_id"
			join "social_accounts" a on a."id" = p."account_id"
			join "social_accounts" src on src."platform" = 'instagram' and src."handle" = ps."value"
			where ps."kind" = 'instagram_account' and a."platform" = 'instagram'
				and lower(a."handle") <> lower(ps."value")
				and a."display_name" is not null and a."display_name" = src."display_name";
		`);
		this.addSql(`
			delete from "social_account_snapshots" s using "_copied_profile_accounts" c
			where s."account_id" = c."account_id" and s."source" = 'post' and s."followers" = c."src_followers";
		`);
		this.addSql(`
			update "social_posts" p set "author_fans" = null from "_copied_profile_accounts" c
			where p."account_id" = c."account_id" and p."author_fans" = c."src_followers";
		`);
		this.addSql(`
			update "creators" cr set "name" = a."handle", "updated_at" = now()
			from "social_accounts" a join "_copied_profile_accounts" c on c."account_id" = a."id"
			where cr."id" = a."creator_id" and cr."name" = c."src_name"
				and (select count(*) from "social_accounts" x where x."creator_id" = cr."id") = 1;
		`);
		this.addSql(`
			update "social_accounts" a set "display_name" = null, "updated_at" = now(),
				"followers" = (
					select s."followers" from "social_account_snapshots" s
					where s."account_id" = a."id" and s."followers" is not null
					order by s."scraped_at" desc limit 1
				)
			from "_copied_profile_accounts" c where c."account_id" = a."id";
		`);
		this.addSql(`
			update "social_accounts" a set "brand_id" = null, "branch_id" = null, "brand_source" = null, "updated_at" = now()
			from "_copied_profile_accounts" c where c."account_id" = a."id" and a."brand_source" = 'handle';
		`);
		this.addSql(`drop table if exists "_copied_profile_accounts";`);
	}

	override down(): void | Promise<void> {
		// The copied names and counts were wrong; nothing to restore.
	}
}
