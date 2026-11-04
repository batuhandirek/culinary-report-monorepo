import { Migration } from '@mikro-orm/migrations';

// The monthly run's result keys whose position changed when the reading steps left it (old key
// → new key). The reading steps' own keys are dropped: `IngestionService` reads now, and the
// steps after them record what it read under `read`
const MONTHLY_KEYS: [string, string][] = [
	['6. LOOKUP_VENUES', '4. LOOKUP_VENUES'],
	['8. SCRAPE_VENUE_SOCIAL', '5. SCRAPE_VENUE_SOCIAL'],
	['9. SCRAPE_ACCOUNTS', '6. SCRAPE_ACCOUNTS'],
	['12. FILL_COMPETITORS', '7. FILL_COMPETITORS'],
	['13. SCRAPE_REVIEWS', '8. SCRAPE_REVIEWS'],
	['15. REFRESH_VENUE_DETAILS', '9. REFRESH_VENUE_DETAILS'],
	['16. SCRAPE_DELIVERY', '10. SCRAPE_DELIVERY'],
	['17. SCRAPE_COMMENTS', '11. SCRAPE_COMMENTS'],
	['19. SCRAPE_PRESS', '12. SCRAPE_PRESS'],
	['20. TRACK_SEARCH_RANKS', '13. TRACK_SEARCH_RANKS'],
	['21. SEARCH_INTEREST', '14. SEARCH_INTEREST'],
	['22. BUILD_REPORTS', '15. BUILD_REPORTS'],
	['23. SCORE_LEADS', '16. SCORE_LEADS'],
];
const DROPPED = [
	'4. EXTRACT_MENTIONS',
	'5. MATCH_MENTIONS',
	'7. MATCH_MENTIONS',
	'10. EXTRACT_MENTIONS',
	'11. MATCH_MENTIONS',
	'14. ANALYSE_REVIEWS',
	'18. ANALYSE_COMMENTS',
];

const values = (pairs: [string, string][]) => pairs.map(([from, to]) => `('${from}', '${to}')`).join(', ');
const list = (keys: string[]) => keys.map(k => `'${k}'`).join(', ');

/**
 * Written by hand (not generated): the monthly run lost its reading steps (`EXTRACT_MENTIONS`,
 * `MATCH_MENTIONS`, `ANALYSE_REVIEWS`, `ANALYSE_COMMENTS`), so stored monthly results are re-keyed
 * to the new positions and the dev data keeps reading right on the Data page and for "Finish the
 * month". Runs from before `SCRAPE_BLOGS` joined (October's first) keep keys no step reads now.
 * `Migration20261104132333` added `WAITING` and `TRACK_PROFILES`.
 */
export class Migration20261104150000_monthly_without_reading extends Migration {
	override up(): void | Promise<void> {
		this.addSql(
			`update "pipeline_runs" r set "result" = coalesce((
				select jsonb_object_agg(coalesce(m.to_key, e.key), e.value)
				from jsonb_each(r."result") e left join (values ${values(MONTHLY_KEYS)}) as m(from_key, to_key) on m.from_key = e.key
				where e.key not in (${list(DROPPED)})
			), '{}'::jsonb) where r."step" = 'MONTHLY' and r."result" is not null and r."result" <> '{}'::jsonb;`,
		);
		this.addSql(
			`update "apify_runs" a set "step_key" = m.to_key
			from (values ${values(MONTHLY_KEYS)}) as m(from_key, to_key), "pipeline_runs" r
			where a."step_key" = m.from_key and r.id = a."pipeline_run_id" and r."step" = 'MONTHLY';`,
		);
	}

	override down(): void | Promise<void> {
		// The dropped reading results are gone; the moved keys go back
		const back: [string, string][] = MONTHLY_KEYS.map(([from, to]) => [to, from]);
		this.addSql(
			`update "pipeline_runs" r set "result" = (
				select jsonb_object_agg(coalesce(m.to_key, e.key), e.value)
				from jsonb_each(r."result") e left join (values ${values(back)}) as m(from_key, to_key) on m.from_key = e.key
			) where r."step" = 'MONTHLY' and r."result" is not null and r."result" <> '{}'::jsonb;`,
		);
		this.addSql(
			`update "apify_runs" a set "step_key" = m.to_key
			from (values ${values(back)}) as m(from_key, to_key), "pipeline_runs" r
			where a."step_key" = m.from_key and r.id = a."pipeline_run_id" and r."step" = 'MONTHLY';`,
		);
	}
}
