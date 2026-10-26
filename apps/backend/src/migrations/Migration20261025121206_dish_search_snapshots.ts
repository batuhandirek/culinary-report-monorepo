import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (not generated): dish searches become dated snapshots. Each row gets the city's
 * local date of its search and that date split out (year, month, week, weekday…), filled from
 * `searched_at` for the rows already stored, which the generator's plain not-null columns can't
 * do; the unique key moves from the month to the day. Cities get the interval between snapshots.
 */
export class Migration20261025121206_dish_search_snapshots extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`alter table "cities" add column "dish_search_every_days" int not null default 30;`);

		this.addSql(
			`alter table "dish_search_ranks" add column "searched_on" date null, add column "year" int null, add column "month_of_year" int null, add column "day_of_month" int null, add column "day_of_year" int null, add column "iso_year" int null, add column "iso_week" int null, add column "weekday" int null;`,
		);
		this.addSql(
			`update "dish_search_ranks" d set "searched_on" = (d."searched_at" at time zone c."timezone")::date from "cities" c where c."id" = d."city_id";`,
		);
		this.addSql(
			`update "dish_search_ranks" set "year" = extract(year from "searched_on"), "month" = to_char("searched_on", 'YYYY-MM'), "month_of_year" = extract(month from "searched_on"), "day_of_month" = extract(day from "searched_on"), "day_of_year" = extract(doy from "searched_on"), "iso_year" = extract(isoyear from "searched_on"), "iso_week" = extract(week from "searched_on"), "weekday" = extract(isodow from "searched_on");`,
		);
		this.addSql(
			`alter table "dish_search_ranks" alter column "searched_on" set not null, alter column "year" set not null, alter column "month_of_year" set not null, alter column "day_of_month" set not null, alter column "day_of_year" set not null, alter column "iso_year" set not null, alter column "iso_week" set not null, alter column "weekday" set not null;`,
		);
		this.addSql(
			`alter table "dish_search_ranks" drop constraint "dish_search_ranks_city_id_topic_id_district_month_rank_unique";`,
		);
		this.addSql(
			`alter table "dish_search_ranks" add constraint "dish_search_ranks_city_id_topic_id_district_searched_on_rank_unique" unique ("city_id", "topic_id", "district", "searched_on", "rank");`,
		);
	}

	override down(): void | Promise<void> {
		this.addSql(
			`alter table "dish_search_ranks" drop constraint "dish_search_ranks_city_id_topic_id_district_searched_on_rank_unique";`,
		);
		this.addSql(
			`alter table "dish_search_ranks" add constraint "dish_search_ranks_city_id_topic_id_district_month_rank_unique" unique ("city_id", "topic_id", "district", "month", "rank");`,
		);
		this.addSql(
			`alter table "dish_search_ranks" drop column "searched_on", drop column "year", drop column "month_of_year", drop column "day_of_month", drop column "day_of_year", drop column "iso_year", drop column "iso_week", drop column "weekday";`,
		);
		this.addSql(`alter table "cities" drop column "dish_search_every_days";`);
	}
}
