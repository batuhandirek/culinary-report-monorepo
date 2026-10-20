import { randomUUID } from 'node:crypto';

import { Migration } from '@mikro-orm/migrations';

const CHUNK = 500;

// `brandKey` as of this migration, copied: a migration must not move when the app's code does
const STOPWORDS = new Set(['restaurant', 'restaurante', 'ristorante', 'cafe', 'bar', 'the', 'and', 'und', 'das', 'der', 'die', 'kitchen', 'bistro', 'eatery', 'grill', 'lounge', 'pizzeria', 'trattoria', 'coffee', 'by']);
const brandKey = (name: string): string =>
	name
		.replace(/\([^)]*\)/g, ' ')
		.split(/\s[|\-–·•]\s|[|]/)[0]
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replaceAll('ß', 'ss')
		.replace(/[^a-z0-9 ]+/g, ' ')
		.split(' ')
		.filter(w => w && !STOPWORDS.has(w))
		.join(' ');

/**
 * Written by hand (not generated): the brand becomes the unit. The generator would drop and
 * recreate the reports', prospects', members' and competitors' keys and lose the rows; this
 * moves them onto brands instead.
 *
 * - Dismissed suggestions move to `brand_dismissals`; `brands.status` and the unique key go.
 * - Every venue without a brand gets one of its own, named like it; `venues.brand_id` is required.
 * - The lead score moves from venues to their brands (a brand's best branch's).
 * - Mentions get `brand_id`; a brand-level one (it sat on the main branch) loses its venue.
 *   `brand_level` and `venues.brand_main` go.
 * - Reports are keyed by brand × city × month (a clash keeps the newest; a chain report's
 *   branch rows' `main` becomes `described`), prospects by brand
 *   (a clash keeps the oldest), portal members by brand (`brand_members`).
 * - Competitors become `brand_competitors`: the venue's brand competes with the old competitor
 *   venue, its own branches left out.
 * - Search interest links the brand; the term kind `venue` becomes `brand`.
 */
export class Migration20261018170000_brand_as_unit extends Migration {
	override async up(): Promise<void> {
		const sql = (q: string, params?: unknown[]) => this.execute(q, params);

		// Dismissed suggestions
		await sql(`create table "brand_dismissals" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "key" text not null, "name" text not null, primary key ("id"));`);
		await sql(`alter table "brand_dismissals" add constraint "brand_dismissals_key_unique" unique ("key");`);
		await sql(`insert into "brand_dismissals" ("key", "name") select "key", "name" from "brands" where "status" = 'dismissed';`);
		await sql(`update "venues" set "brand_id" = null where "brand_id" in (select "id" from "brands" where "status" = 'dismissed');`);
		await sql(`delete from "brands" where "status" = 'dismissed';`);
		await sql(`alter table "brands" drop constraint "brands_key_unique";`);
		await sql(`alter table "brands" drop column "status";`);
		await sql(`drop type "brand_status";`);
		await sql(`create index "brands_key_index" on "brands" ("key");`);
		await sql(`alter table "brands" add column "lead_score" real null, add column "lead_signals" jsonb null;`);
		await sql(`create index "brands_lead_score_index" on "brands" ("lead_score");`);

		// A brand of its own for every venue without one
		const lone = (await sql(`select "id", "name" from "venues" where "brand_id" is null order by "id";`)) as {
			id: string;
			name: string;
		}[];
		for (let i = 0; i < lone.length; i += CHUNK) {
			const rows = lone.slice(i, i + CHUNK).map(v => ({ venueId: v.id, brandId: randomUUID(), name: v.name }));
			await sql(
				`insert into "brands" ("id", "name", "key") values ${rows.map(() => '(?, ?, ?)').join(', ')};`,
				rows.flatMap(r => [r.brandId, r.name, brandKey(r.name)]),
			);
			await sql(
				`update "venues" v set "brand_id" = x."brand_id"::uuid
				from (values ${rows.map(() => '(?, ?)').join(', ')}) as x("venue_id", "brand_id")
				where v."id" = x."venue_id"::uuid;`,
				rows.flatMap(r => [r.venueId, r.brandId]),
			);
		}

		// The lead score: a brand's best branch's
		await sql(`update "brands" b set "lead_score" = x."lead_score", "lead_signals" = x."lead_signals"
			from (
				select distinct on ("brand_id") "brand_id", "lead_score", "lead_signals" from "venues"
				where "lead_score" is not null and not "closed"
				order by "brand_id", "lead_score" desc
			) x
			where b."id" = x."brand_id";`);
		await sql(`drop index "venues_lead_score_index";`);
		await sql(`alter table "venues" drop column "lead_score", drop column "lead_signals", drop column "brand_main";`);
		await sql(`alter table "venues" drop constraint "venues_brand_id_foreign";`);
		await sql(`alter table "venues" alter column "brand_id" set not null;`);
		await sql(`alter table "venues" add constraint "venues_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade;`);

		// Mentions: the brand always, the branch when known
		await sql(`alter table "mentions" add column "brand_id" uuid null;`);
		await sql(`update "mentions" m set "brand_id" = v."brand_id" from "venues" v where v."id" = m."venue_id";`);
		await sql(`update "mentions" set "venue_id" = null where "brand_level";`);
		await sql(`alter table "mentions" drop column "brand_level";`);
		await sql(`alter table "mentions" add constraint "mentions_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete set null;`);
		await sql(`create index "mentions_brand_id_index" on "mentions" ("brand_id");`);

		// Reports: brand × city × month
		await sql(`alter table "reports" add column "brand_id" uuid null, add column "city_id" uuid null;`);
		await sql(`update "reports" r set "brand_id" = v."brand_id", "city_id" = v."city_id" from "venues" v where v."id" = r."venue_id";`);
		await sql(`delete from "reports" r using "reports" o
			where o."brand_id" = r."brand_id" and o."city_id" = r."city_id" and o."month" = r."month"
				and (o."updated_at" > r."updated_at" or (o."updated_at" = r."updated_at" and o."id" > r."id"));`);
		await sql(`alter table "reports" drop constraint "reports_venue_id_month_unique";`);
		await sql(`alter table "reports" drop constraint "reports_venue_id_foreign";`);
		await sql(`alter table "reports" drop column "venue_id";`);
		await sql(`alter table "reports" alter column "brand_id" set not null, alter column "city_id" set not null;`);
		await sql(`alter table "reports" add constraint "reports_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);
		await sql(`alter table "reports" add constraint "reports_city_id_foreign" foreign key ("city_id") references "cities" ("id") on update cascade on delete cascade;`);
		await sql(`create index "reports_city_id_index" on "reports" ("city_id");`);
		await sql(`alter table "reports" add constraint "reports_brand_id_city_id_month_unique" unique ("brand_id", "city_id", "month");`);
		// A chain report's branch rows said `main`; they say `described` now
		await sql(`update "reports" set "data" = jsonb_set("data", '{brand,branches}', (
			select jsonb_agg((b - 'main') || jsonb_build_object('described', coalesce((b->>'main')::boolean, false)))
			from jsonb_array_elements("data"->'brand'->'branches') b
		)) where "data"->'brand'->'branches' is not null;`);

		// Prospects: one per brand
		await sql(`alter table "prospects" add column "brand_id" uuid null;`);
		await sql(`update "prospects" p set "brand_id" = v."brand_id" from "venues" v where v."id" = p."venue_id";`);
		await sql(`delete from "prospects" p using "prospects" o
			where o."brand_id" = p."brand_id" and (o."created_at" < p."created_at" or (o."created_at" = p."created_at" and o."id" < p."id"));`);
		await sql(`alter table "prospects" drop constraint "prospects_venue_id_unique";`);
		await sql(`alter table "prospects" drop constraint "prospects_venue_id_foreign";`);
		await sql(`alter table "prospects" drop column "venue_id";`);
		await sql(`alter table "prospects" alter column "brand_id" set not null;`);
		await sql(`alter table "prospects" add constraint "prospects_brand_id_unique" unique ("brand_id");`);
		await sql(`alter table "prospects" add constraint "prospects_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);

		// Portal members: of a brand
		await sql(`alter table "venue_members" rename to "brand_members";`);
		await sql(`alter type "venue_member_role" rename to "brand_member_role";`);
		await sql(`alter table "brand_members" rename constraint "venue_members_pkey" to "brand_members_pkey";`);
		await sql(`alter table "brand_members" rename constraint "venue_members_user_id_foreign" to "brand_members_user_id_foreign";`);
		await sql(`alter table "brand_members" rename constraint "venue_members_invited_by_id_foreign" to "brand_members_invited_by_id_foreign";`);
		await sql(`alter index "venue_members_user_id_index" rename to "brand_members_user_id_index";`);
		await sql(`alter table "brand_members" add column "brand_id" uuid null;`);
		await sql(`update "brand_members" m set "brand_id" = v."brand_id" from "venues" v where v."id" = m."venue_id";`);
		await sql(`delete from "brand_members" m using "brand_members" o
			where o."brand_id" = m."brand_id" and o."user_id" = m."user_id"
				and (o."created_at" < m."created_at" or (o."created_at" = m."created_at" and o."id" < m."id"));`);
		await sql(`alter table "brand_members" drop column "venue_id";`);
		await sql(`alter table "brand_members" alter column "brand_id" set not null;`);
		await sql(`create index "brand_members_brand_id_index" on "brand_members" ("brand_id");`);
		await sql(`alter table "brand_members" add constraint "brand_members_user_id_brand_id_unique" unique ("user_id", "brand_id");`);
		await sql(`alter table "brand_members" add constraint "brand_members_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);

		// Competitors: a brand's, each a venue or a rival brand
		await sql(`alter type "venue_competitor_picked_by" rename to "competitor_picked_by";`);
		await sql(`create table "brand_competitors" ("id" serial primary key, "created_at" timestamptz not null default now(), "brand_id" uuid not null, "venue_id" uuid null, "rival_id" uuid null, "picked_by" "competitor_picked_by" not null default 'admin');`);
		await sql(`create index "brand_competitors_brand_id_index" on "brand_competitors" ("brand_id");`);
		await sql(`create index "brand_competitors_venue_id_index" on "brand_competitors" ("venue_id");`);
		await sql(`create index "brand_competitors_rival_id_index" on "brand_competitors" ("rival_id");`);
		await sql(`alter table "brand_competitors" add constraint "brand_competitors_brand_id_venue_id_unique" unique ("brand_id", "venue_id");`);
		await sql(`alter table "brand_competitors" add constraint "brand_competitors_brand_id_rival_id_unique" unique ("brand_id", "rival_id");`);
		await sql(`alter table "brand_competitors" add constraint "brand_competitors_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);
		await sql(`alter table "brand_competitors" add constraint "brand_competitors_venue_id_foreign" foreign key ("venue_id") references "venues" ("id") on update cascade on delete cascade;`);
		await sql(`alter table "brand_competitors" add constraint "brand_competitors_rival_id_foreign" foreign key ("rival_id") references "brands" ("id") on update cascade on delete cascade;`);
		await sql(`insert into "brand_competitors" ("created_at", "brand_id", "venue_id", "picked_by")
			select distinct on (v."brand_id", c."competitor_id") c."created_at", v."brand_id", c."competitor_id", c."picked_by"
			from "venue_competitors" c
			join "venues" v on v."id" = c."venue_id"
			join "venues" cv on cv."id" = c."competitor_id"
			where cv."brand_id" <> v."brand_id"
			order by v."brand_id", c."competitor_id", c."created_at";`);
		await sql(`drop table "venue_competitors";`);

		// Search interest: the brand's name
		await sql(`alter type "search_term_kind" rename value 'venue' to 'brand';`);
		for (const table of ['trend_search_interest', 'trend_related_queries']) {
			await sql(`alter table "${table}" add column "brand_id" uuid null;`);
			await sql(`update "${table}" t set "brand_id" = v."brand_id" from "venues" v where v."id" = t."venue_id";`);
			await sql(`alter table "${table}" drop constraint "${table}_venue_id_foreign";`);
			await sql(`alter table "${table}" drop column "venue_id";`);
			await sql(`alter table "${table}" add constraint "${table}_brand_id_foreign" foreign key ("brand_id") references "brands" ("id") on update cascade on delete cascade;`);
		}
	}

	override down(): void {
		throw new Error('brand_as_unit moves rows between keys and cannot be undone: restore a backup instead');
	}
}
