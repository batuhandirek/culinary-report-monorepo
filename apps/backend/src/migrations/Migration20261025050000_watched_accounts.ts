import { Migration } from '@mikro-orm/migrations';

// The monthly run's result keys whose position changed when `SCRAPE_ACCOUNTS` moved up to
// right after `SCRAPE_VENUE_SOCIAL` (old key → new key)
const MONTHLY_KEYS: [string, string][] = [
	['9. EXTRACT_MENTIONS', '10. EXTRACT_MENTIONS'],
	['10. MATCH_MENTIONS', '11. MATCH_MENTIONS'],
	['11. FILL_COMPETITORS', '12. FILL_COMPETITORS'],
	['12. SCRAPE_REVIEWS', '13. SCRAPE_REVIEWS'],
	['13. ANALYSE_REVIEWS', '14. ANALYSE_REVIEWS'],
	['14. REFRESH_VENUE_DETAILS', '15. REFRESH_VENUE_DETAILS'],
	['15. SCRAPE_DELIVERY', '16. SCRAPE_DELIVERY'],
	['16. SCRAPE_OWN_ACCOUNTS', '9. SCRAPE_ACCOUNTS'],
];

const values = (pairs: [string, string][]) => pairs.map(([from, to]) => `('${from}', '${to}')`).join(', ');

/** Renames the keys of a run's `result` (and its Apify runs' `step_key`) by the pairs given. */
const remap = (pairs: [string, string][], where: string) => [
	`update "pipeline_runs" r set "result" = (
		select jsonb_object_agg(coalesce(m.to_key, e.key), e.value)
		from jsonb_each(r."result") e left join (values ${values(pairs)}) as m(from_key, to_key) on m.from_key = e.key
	) where ${where} and r."result" is not null and r."result" <> '{}'::jsonb;`,
	`update "apify_runs" a set "step_key" = m.to_key
	from (values ${values(pairs)}) as m(from_key, to_key), "pipeline_runs" r
	where a."step_key" = m.from_key and r.id = a."pipeline_run_id" and ${where};`,
];

/**
 * Written by hand (not generated): `SCRAPE_OWN_ACCOUNTS` becomes `SCRAPE_ACCOUNTS` (it scrapes
 * every watched account now, creators a city follows and rivals' own accounts too) and moves up
 * in the monthly run, so stored results are re-keyed to the new positions and the dev data keeps
 * reading right on the Data page and for "Finish the month". The generator cannot rename an enum
 * value. Also adds the weekly `SCRAPE_ACCOUNTS_RECENT` and the account source kinds.
 */
export class Migration20261025050000_watched_accounts extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`alter type "pipeline_step" rename value 'SCRAPE_OWN_ACCOUNTS' to 'SCRAPE_ACCOUNTS';`);
		this.addSql(`alter type "pipeline_step" add value if not exists 'SCRAPE_ACCOUNTS_RECENT' after 'SCRAPE_ACCOUNTS';`);
		this.addSql(`alter type "city_source_kind" add value if not exists 'tiktok_account' after 'blog';`);
		this.addSql(`alter type "city_source_kind" add value if not exists 'instagram_account' after 'tiktok_account';`);
		this.addSql(`alter type "post_source_kind" add value if not exists 'tiktok_account' after 'venue_place';`);
		this.addSql(`alter type "post_source_kind" add value if not exists 'instagram_account' after 'tiktok_account';`);
		for (const sql of remap(MONTHLY_KEYS, `r."step" = 'MONTHLY'`)) this.addSql(sql);
		for (const sql of remap([['1. SCRAPE_OWN_ACCOUNTS', '1. SCRAPE_ACCOUNTS']], `r."step" = 'SCRAPE_ACCOUNTS'`)) this.addSql(sql);
		this.addSql(
			`update "cities" set "step_budgets_usd" = ("step_budgets_usd" - 'SCRAPE_OWN_ACCOUNTS') || jsonb_build_object('SCRAPE_ACCOUNTS', "step_budgets_usd"->'SCRAPE_OWN_ACCOUNTS')
			where "step_budgets_usd" ? 'SCRAPE_OWN_ACCOUNTS';`,
		);
	}

	override down(): void | Promise<void> {
		// Enum values added stay (Postgres cannot drop one); the rename and the keys go back
		this.addSql(
			`update "cities" set "step_budgets_usd" = ("step_budgets_usd" - 'SCRAPE_ACCOUNTS') || jsonb_build_object('SCRAPE_OWN_ACCOUNTS', "step_budgets_usd"->'SCRAPE_ACCOUNTS')
			where "step_budgets_usd" ? 'SCRAPE_ACCOUNTS';`,
		);
		const back = (pairs: [string, string][]) => pairs.map(([from, to]): [string, string] => [to, from]);
		for (const sql of remap(back([['1. SCRAPE_OWN_ACCOUNTS', '1. SCRAPE_ACCOUNTS']]), `r."step" = 'SCRAPE_ACCOUNTS'`)) this.addSql(sql);
		for (const sql of remap(back(MONTHLY_KEYS), `r."step" = 'MONTHLY'`)) this.addSql(sql);
		this.addSql(`alter type "pipeline_step" rename value 'SCRAPE_ACCOUNTS' to 'SCRAPE_OWN_ACCOUNTS';`);
	}
}
