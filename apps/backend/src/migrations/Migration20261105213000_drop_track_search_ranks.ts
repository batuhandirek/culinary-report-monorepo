import { Migration } from '@mikro-orm/migrations';

// The monthly run's result keys after `TRACK_SEARCH_RANKS` move up one (old key → new key)
const MONTHLY_KEYS: [string, string][] = [
	['14. SEARCH_INTEREST', '13. SEARCH_INTEREST'],
	['15. BUILD_REPORTS', '14. BUILD_REPORTS'],
	['16. SCORE_LEADS', '15. SCORE_LEADS'],
];
const DROPPED = '13. TRACK_SEARCH_RANKS';

// `pipeline_step` without `TRACK_SEARCH_RANKS`, in its order
const STEPS = [
	'SCRAPE_VENUES',
	'SEARCH_BRANCHES',
	'SYNC_OSM_PLACES',
	'LOOKUP_OSM_PLACES',
	'SCRAPE_TIKTOK',
	'SCRAPE_TIKTOK_RECENT',
	'SCRAPE_INSTAGRAM',
	'SCRAPE_INSTAGRAM_RECENT',
	'SCRAPE_INSTAGRAM_REELS',
	'SCRAPE_BLOGS',
	'EXTRACT_MENTIONS',
	'MATCH_MENTIONS',
	'LOOKUP_VENUES',
	'SCRAPE_VENUE_SOCIAL',
	'SCRAPE_VENUE_SOCIAL_RECENT',
	'FILL_COMPETITORS',
	'SCRAPE_REVIEWS',
	'BACKFILL_REVIEWS',
	'ANALYSE_REVIEWS',
	'REFRESH_VENUE_DETAILS',
	'SCRAPE_ACCOUNTS',
	'SCRAPE_ACCOUNTS_RECENT',
	'SCRAPE_CREATORS',
	'FILL_ACCOUNT_FOLLOWERS',
	'TRACK_PROFILES',
	'FIND_OWN_ACCOUNTS',
	'READ_MENTIONED_PROFILES',
	'SCRAPE_COMMENTS',
	'ANALYSE_COMMENTS',
	'SCRAPE_PRESS',
	'TRACK_DISH_SEARCHES',
	'SEARCH_INTEREST',
	'BUILD_REPORTS',
	'SCORE_LEADS',
	'WATCH_REVIEWS',
	'SAMPLE_BUSYNESS',
	'SAMPLE_RESERVATIONS',
	'SNAPSHOT_RATINGS',
	'SCRAPE_DELIVERY',
	'REFRESH_POST_COUNTS',
	'MONTHLY',
];

const values = (pairs: [string, string][]) => pairs.map(([from, to]) => `('${from}', '${to}')`).join(', ');

/**
 * Written by hand (not generated): the `TRACK_SEARCH_RANKS` step is gone (the user's call,
 * 2026-11-05: a report branch's place on its food searches is read from the dish-search
 * snapshots). Its runs go (their Apify runs stay, unlinked, with their cost), the monthly run's
 * later result keys move up one, and the step leaves the `pipeline_step` enum, which Postgres
 * can only drop a value from by recreating the type. The `venue_search_ranks` table goes in the
 * generated `Migration20261105212703`.
 */
export class Migration20261105213000_drop_track_search_ranks extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`delete from "pipeline_runs" where "step" = 'TRACK_SEARCH_RANKS';`);
		// A city's budget for the step would fail its DTO, keyed by the enum
		this.addSql(`update "cities" set "step_budgets_usd" = "step_budgets_usd" - 'TRACK_SEARCH_RANKS' where "step_budgets_usd" ? 'TRACK_SEARCH_RANKS';`);
		this.addSql(
			`update "pipeline_runs" r set "result" = coalesce((
				select jsonb_object_agg(coalesce(m.to_key, e.key), e.value)
				from jsonb_each(r."result") e left join (values ${values(MONTHLY_KEYS)}) as m(from_key, to_key) on m.from_key = e.key
				where e.key <> '${DROPPED}'
			), '{}'::jsonb) where r."step" = 'MONTHLY' and r."result" is not null and r."result" <> '{}'::jsonb;`,
		);
		this.addSql(
			`update "apify_runs" a set "step_key" = m.to_key
			from (values ${values(MONTHLY_KEYS)}) as m(from_key, to_key), "pipeline_runs" r
			where a."step_key" = m.from_key and r.id = a."pipeline_run_id" and r."step" = 'MONTHLY';`,
		);
		this.addSql(`alter type "pipeline_step" rename to "pipeline_step_old";`);
		this.addSql(`create type "pipeline_step" as enum (${STEPS.map(s => `'${s}'`).join(', ')});`);
		this.addSql(
			`alter table "pipeline_runs" alter column "step" type "pipeline_step" using "step"::text::"pipeline_step";`,
		);
		this.addSql(`drop type "pipeline_step_old";`);
	}

	override down(): void | Promise<void> {
		// The deleted runs are gone; the step comes back and the keys move down again
		this.addSql(`alter type "pipeline_step" add value if not exists 'TRACK_SEARCH_RANKS' after 'SCRAPE_PRESS';`);
		const back: [string, string][] = MONTHLY_KEYS.map(([from, to]) => [to, from]);
		this.addSql(
			`update "pipeline_runs" r set "result" = (
				select jsonb_object_agg(coalesce(m.to_key, e.key), e.value)
				from jsonb_each(r."result") e left join (values ${values(back)}) as m(from_key, to_key) on m.from_key = e.key
			) where r."step" = 'MONTHLY' and r."result" is not null and r."result" <> '{}'::jsonb;`,
		);
	}
}
