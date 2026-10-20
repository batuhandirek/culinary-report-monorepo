import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand around the generated DDL (`schema:update --dump`), to keep the dev data: every
 * post author becomes a `SocialAccount` with a `Creator` of its own (first city, latest follower
 * count), posts point at their account, and the brand accounts (`brand_accounts`, gone) become
 * the accounts' brand links: an active one sets `brand_id`, an admin's removal goes to
 * `rejected_brand_ids`, and their snapshots move to `social_account_snapshots`. Grouping one
 * person's TikTok and Instagram into one creator is `SocialAccountService.groupCreators`, run by
 * account matching.
 */
export class Migration20261019100000_accounts_and_creators extends Migration {
	override async up(): Promise<void> {
		const sql = (q: string) => this.execute(q);

		await sql(`create type "account_brand_source" as enum ('handle', 'website', 'prospect', 'admin');`);
		await sql(`create table "creators" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "name" text not null, primary key ("id"));`);
		await sql(`create table "social_accounts" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "platform" "social_platform" not null, "handle" text not null, "display_name" text null, "followers" int null, "followers_at" timestamptz null, "city_id" uuid not null, "creator_id" uuid not null, "brand_id" uuid null, "branch_id" uuid null, "brand_source" "account_brand_source" null, "suggested_brand_id" uuid null, "suggested_score" real null, "rejected_brand_ids" jsonb not null default '[]', primary key ("id"));`);
		await sql(`create index "social_accounts_city_id_index" on "social_accounts" ("city_id");`);
		await sql(`create index "social_accounts_creator_id_index" on "social_accounts" ("creator_id");`);
		await sql(`create index "social_accounts_brand_id_index" on "social_accounts" ("brand_id");`);
		await sql(`create index "social_accounts_suggested_brand_id_index" on "social_accounts" ("suggested_brand_id");`);
		await sql(`alter table "social_accounts" add constraint "social_accounts_platform_handle_unique" unique ("platform", "handle");`);
		await sql(`create table "social_account_snapshots" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "account_id" uuid not null, "month" text not null, "followers" int null, "posts" int null, "avg_views" real null, "avg_likes" real null, "posts_last30days" int null, "scraped_at" timestamptz not null, primary key ("id"));`);
		await sql(`alter table "social_account_snapshots" add constraint "social_account_snapshots_account_id_month_unique" unique ("account_id", "month");`);
		await sql(`alter table "social_accounts" add constraint "social_accounts_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade;`);
		await sql(`alter table "social_accounts" add constraint "social_accounts_creator_id_foreign" foreign key ("creator_id") references "creators" ("id") on update cascade;`);
		await sql(`alter table "social_accounts" add constraint "social_accounts_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete set null;`);
		await sql(`alter table "social_accounts" add constraint "social_accounts_branch_id_foreign" foreign key ("branch_id") references "venues" ("id") on update cascade on delete set null;`);
		await sql(`alter table "social_accounts" add constraint "social_accounts_suggested_brand_id_foreign" foreign key ("suggested_brand_id") references "brands" ("id") on update cascade on delete set null;`);
		await sql(`alter table "social_account_snapshots" add constraint "social_account_snapshots_account_id_foreign" foreign key ("account_id") references "social_accounts" ("id") on update cascade on delete cascade;`);
		await sql(`alter table "social_posts" add "account_id" uuid null;`);
		await sql(`alter table "social_posts" add constraint "social_posts_account_id_foreign" foreign key ("account_id") references "social_accounts" ("id") on update cascade on delete set null;`);
		await sql(`create index "social_posts_account_id_index" on "social_posts" ("account_id");`);

		// One account per platform and handle among the posts (first city, latest follower count),
		// and the brand accounts' handles no post was by (the brand's busiest branch's city)
		await sql(`create temporary table "account_seed" on commit drop as
			select gen_random_uuid() as "id", gen_random_uuid() as "creator_id", s.*
			from (
				select distinct on (p."platform", lower(p."author"))
					p."platform", lower(p."author") as "handle", p."city_id",
					(select q."author_fans" from "social_posts" q
						where q."platform" = p."platform" and lower(q."author") = lower(p."author") and q."author_fans" is not null
						order by q."updated_at" desc limit 1) as "followers",
					(select q."updated_at" from "social_posts" q
						where q."platform" = p."platform" and lower(q."author") = lower(p."author") and q."author_fans" is not null
						order by q."updated_at" desc limit 1) as "followers_at"
				from "social_posts" p
				where p."author" is not null and p."author" <> ''
				order by p."platform", lower(p."author"), p."posted_at", p."id"
			) s;`);
		await sql(`insert into "account_seed" ("id", "creator_id", "platform", "handle", "city_id", "followers", "followers_at")
			select distinct on (a."platform", a."handle")
				gen_random_uuid(), gen_random_uuid(), a."platform"::text::"social_platform", a."handle",
				(select v."city_id" from "venues" v where v."brand_id" = a."brand_id"
					order by v."closed", v."reviews_count" desc nulls last, v."id" limit 1),
				null::int, null::timestamptz
			from "brand_accounts" a
			where not exists (
				select 1 from "account_seed" s where s."platform"::text = a."platform"::text and s."handle" = a."handle"
			)
			order by a."platform", a."handle", a."created_at";`);
		await sql(`delete from "account_seed" where "city_id" is null;`);
		await sql(`insert into "creators" ("id", "name") select "creator_id", "handle" from "account_seed";`);
		await sql(`insert into "social_accounts" ("id", "platform", "handle", "city_id", "creator_id", "followers", "followers_at")
			select "id", "platform", "handle", "city_id", "creator_id", "followers", "followers_at" from "account_seed";`);
		await sql(`update "social_posts" p set "account_id" = a."id"
			from "social_accounts" a
			where a."platform" = p."platform" and a."handle" = lower(p."author");`);

		// The brand links: an active brand account links the brand (the oldest one, when two
		// brands had the handle), an admin's removal is a rejection
		await sql(`update "social_accounts" s set
				"brand_id" = a."brand_id",
				"branch_id" = a."branch_id",
				"brand_source" = (case a."source"::text when 'detected' then 'handle' else a."source"::text end)::"account_brand_source"
			from (
				select distinct on ("platform", "handle") * from "brand_accounts"
				where "ignored_at" is null
				order by "platform", "handle", "created_at"
			) a
			where s."platform"::text = a."platform"::text and s."handle" = a."handle";`);
		await sql(`update "social_accounts" s set "rejected_brand_ids" = r."ids"
			from (
				select "platform", "handle", jsonb_agg(distinct "brand_id") as "ids" from "brand_accounts"
				where "ignored_at" is not null group by "platform", "handle"
			) r
			where s."platform"::text = r."platform"::text and s."handle" = r."handle";`);
		await sql(`insert into "social_account_snapshots" ("account_id", "month", "followers", "posts", "avg_views", "avg_likes", "posts_last30days", "scraped_at", "created_at", "updated_at")
			select distinct on (s."id", n."month")
				s."id", n."month", n."followers", n."posts", n."avg_views", n."avg_likes", n."posts_last30days", n."scraped_at", n."created_at", n."updated_at"
			from "brand_account_snapshots" n
			join "brand_accounts" a on a."id" = n."account_id"
			join "social_accounts" s on s."platform"::text = a."platform"::text and s."handle" = a."handle"
			order by s."id", n."month", n."scraped_at" desc;`);

		await sql(`drop table if exists "brand_account_snapshots" cascade;`);
		await sql(`drop table if exists "brand_accounts" cascade;`);
		await sql(`drop type "account_platform";`);
		await sql(`drop type "account_source";`);
	}
}
