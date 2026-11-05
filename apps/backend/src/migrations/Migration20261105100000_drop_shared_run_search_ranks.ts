import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (not generated): every dish search and search rank stored so far came from one
 * Places run for all of a step's searches, and the actor outputs each place once per run, so a
 * place an earlier search found is missing from every later one (403 of the 528 dish searches of
 * 2026-10-25 lost a place) and the rest were numbered up. The runs also searched from a map in
 * the US, which mixed US places in. The rows go; the one-offs `dish-searches-one-run-each` and
 * `search-ranks-one-run-each` (`ONE_OFF_RUNS`) search again with a run per search. Reports built
 * before keep their copy in `ReportData`.
 */
export class Migration20261105100000_drop_shared_run_search_ranks extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`delete from "dish_search_ranks";`);
		this.addSql(`delete from "venue_search_ranks";`);
	}

	override down(): void | Promise<void> {
		// The rows are gone
	}
}
