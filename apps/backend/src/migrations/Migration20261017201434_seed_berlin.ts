import { Migration } from '@mikro-orm/migrations';

/**
 * Data, written by hand (not generated): Berlin as the first `City`, from the constants it
 * replaces (`PIPELINE_CITY`, `BERLIN_DISTRICTS` and their borders, the TikTok and Instagram
 * sources in their ranked order, the lead score deny-list), and every existing venue, post,
 * lookup and pipeline run pointed at it. The next migration makes those columns not null.
 */
export class Migration20261017201434_seed_berlin extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`insert into "cities" (
			"slug", "name", "aliases", "country", "timezone", "language", "location_query",
			"tiktok_region", "instagram_enabled", "districts", "name_stopwords", "chain_deny_list",
			"step_budgets_usd", "top_venues", "cron_enabled", "active"
		) values (
			'berlin', 'Berlin', '[]', 'DE', 'Europe/Berlin', 'de', 'Berlin, Germany',
			'DE', true, '[{"name": "Mitte", "postalCodes": [], "neighbours": ["Pankow", "Friedrichshain-Kreuzberg", "Tempelhof-Schöneberg", "Charlottenburg-Wilmersdorf", "Reinickendorf"]}, {"name": "Friedrichshain-Kreuzberg", "postalCodes": [], "neighbours": ["Mitte", "Pankow", "Lichtenberg", "Treptow-Köpenick", "Neukölln", "Tempelhof-Schöneberg"]}, {"name": "Pankow", "postalCodes": [], "neighbours": ["Mitte", "Friedrichshain-Kreuzberg", "Lichtenberg", "Reinickendorf"]}, {"name": "Charlottenburg-Wilmersdorf", "postalCodes": [], "neighbours": ["Mitte", "Spandau", "Reinickendorf", "Steglitz-Zehlendorf", "Tempelhof-Schöneberg"]}, {"name": "Spandau", "postalCodes": [], "neighbours": ["Charlottenburg-Wilmersdorf", "Reinickendorf", "Steglitz-Zehlendorf"]}, {"name": "Steglitz-Zehlendorf", "postalCodes": [], "neighbours": ["Charlottenburg-Wilmersdorf", "Spandau", "Tempelhof-Schöneberg"]}, {"name": "Tempelhof-Schöneberg", "postalCodes": [], "neighbours": ["Mitte", "Friedrichshain-Kreuzberg", "Charlottenburg-Wilmersdorf", "Steglitz-Zehlendorf", "Neukölln"]}, {"name": "Neukölln", "postalCodes": [], "neighbours": ["Friedrichshain-Kreuzberg", "Tempelhof-Schöneberg", "Treptow-Köpenick"]}, {"name": "Treptow-Köpenick", "postalCodes": [], "neighbours": ["Friedrichshain-Kreuzberg", "Neukölln", "Lichtenberg", "Marzahn-Hellersdorf"]}, {"name": "Marzahn-Hellersdorf", "postalCodes": [], "neighbours": ["Treptow-Köpenick", "Lichtenberg"]}, {"name": "Lichtenberg", "postalCodes": [], "neighbours": ["Friedrichshain-Kreuzberg", "Pankow", "Treptow-Köpenick", "Marzahn-Hellersdorf"]}, {"name": "Reinickendorf", "postalCodes": [], "neighbours": ["Mitte", "Pankow", "Charlottenburg-Wilmersdorf", "Spandau"]}]', '["berlin"]',
			'["markthalle neun", "rewe", "mustafa", "ruyam", "curry 36", "hofbrau", "hofbraeu"]',
			'{}', 20, true, true
		) on conflict ("slug") do nothing;`);

		// Ranked order kept through `created_at`, one millisecond apart
		this.addSql(`insert into "city_sources" ("city_id", "kind", "value", "created_at", "updated_at")
			select c."id", s."kind"::"city_source_kind", s."value",
				now() + s."position" * interval '1 millisecond', now()
			from "cities" c, (values
				('tiktok_hashtag', 'eatberlin', 0),
				('tiktok_hashtag', 'berlinbrunch', 1),
				('tiktok_hashtag', 'berlinfoodie', 2),
				('tiktok_hashtag', 'berlincuisine', 3),
				('tiktok_hashtag', 'berlinfoodies', 4),
				('tiktok_hashtag', 'berlintaste', 5),
				('tiktok_hashtag', 'berlinveganfood', 6),
				('tiktok_hashtag', 'berlinchefs', 7),
				('tiktok_hashtag', 'berlinpizza', 8),
				('tiktok_hashtag', 'berlinbites', 9),
				('tiktok_hashtag', 'berlinfoodscene', 10),
				('tiktok_hashtag', 'berlinfoodlover', 11),
				('tiktok_hashtag', 'berlinfood', 12),
				('tiktok_hashtag', 'berlinstreetfood', 13),
				('tiktok_hashtag', 'foodberlin', 14),
				('tiktok_hashtag', 'berlinfoodfinds', 15),
				('tiktok_hashtag', 'berlinfinedining', 16),
				('tiktok_hashtag', 'berlindining', 17),
				('tiktok_hashtag', 'berlinsteakhouse', 18),
				('tiktok_hashtag', 'berlinfoodstagram', 19),
				('tiktok_search', 'berlin restaurant', 20),
				('tiktok_search', 'berlin food', 21),
				('tiktok_search', 'berlin essen gehen', 22),
				('tiktok_search', 'restaurant tipp berlin', 23),
				('tiktok_search', 'berlin brunch', 24),
				('tiktok_search', 'berlin cafe', 25),
				('tiktok_search', 'berlin bar', 26),
				('tiktok_search', 'berlin cocktail bar', 27),
				('tiktok_search', 'neues restaurant berlin', 28),
				('tiktok_search', 'berlin street food', 29),
				('tiktok_search', 'berlin pizza', 30),
				('tiktok_search', 'berlin ramen', 31),
				('tiktok_search', 'berlin burger', 32),
				('tiktok_search', 'berlin döner', 33),
				('tiktok_search', 'berlin vietnamese food', 34),
				('tiktok_search', 'berlin italian restaurant', 35),
				('tiktok_search', 'berlin fine dining', 36),
				('tiktok_search', 'berlin date night restaurant', 37),
				('tiktok_search', 'berlin hidden gems food', 38),
				('tiktok_search', 'kreuzberg food', 39),
				('tiktok_search', 'neukölln restaurant', 40),
				('tiktok_search', 'mitte restaurant berlin', 41),
				('tiktok_search', 'prenzlauer berg cafe', 42),
				('tiktok_search', 'friedrichshain bar', 43),
				('instagram_hashtag', 'berlinfood', 44),
				('instagram_hashtag', 'berlinfoodie', 45),
				('instagram_hashtag', 'berlinfoodies', 46),
				('instagram_hashtag', 'foodberlin', 47),
				('instagram_hashtag', 'eatberlin', 48),
				('instagram_hashtag', 'berlineats', 49),
				('instagram_hashtag', 'berlinfoodguide', 50),
				('instagram_hashtag', 'berlinfoodblogger', 51),
				('instagram_hashtag', 'berlinfoodspots', 52),
				('instagram_hashtag', 'berlinrestaurant', 53),
				('instagram_hashtag', 'berlinrestaurants', 54),
				('instagram_hashtag', 'berlinbrunch', 55),
				('instagram_hashtag', 'brunchberlin', 56),
				('instagram_hashtag', 'berlincafe', 57),
				('instagram_hashtag', 'cafeberlin', 58),
				('instagram_hashtag', 'berlincoffee', 59),
				('instagram_hashtag', 'berlinbakery', 60),
				('instagram_hashtag', 'berlinvegan', 61),
				('instagram_hashtag', 'veganberlin', 62),
				('instagram_hashtag', 'berlinstreetfood', 63)
			) as s("kind", "value", "position")
			where c."slug" = 'berlin'
			on conflict ("city_id", "kind", "value") do nothing;`);

		for (const table of ['venues', 'social_posts', 'venue_lookups', 'pipeline_runs']) {
			this.addSql(
				`update "${table}" set "city_id" = (select "id" from "cities" where "slug" = 'berlin') where "city_id" is null;`,
			);
		}
	}

	override down(): void | Promise<void> {
		for (const table of ['venues', 'social_posts', 'venue_lookups', 'pipeline_runs']) {
			this.addSql(`update "${table}" set "city_id" = null;`);
		}
		this.addSql(`delete from "cities" where "slug" = 'berlin';`);
	}
}
