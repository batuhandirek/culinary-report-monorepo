import { Migration } from '@mikro-orm/migrations';

/** The change-only aspect leaves and the aspect their claims move to (kind `change` from now on) */
const FOLDS: [leaf: string, base: string][] = [
	['price_increase', 'price_level'],
	['quality_change', 'food'],
	['staff_change', 'service'],
	['renovation', 'interior'],
	['ownership_change', 'ownership'],
];

/**
 * Hand-written (claim model v2, decided with the user on 2026-10-31): `statements.quote` (the
 * source's own words) and `statements.kind` (opinion, fact, change, …) replace the `change` flag,
 * whose rows become `kind = 'change'` before it goes (the generator would drop it first); the
 * change-only aspect leaves fold into the aspect a claim is about, their claims kind `change`, a
 * new leaf `ownership` taking the owner changes; the second opinion layer goes: `reviews.sentiment`,
 * `mentions.sentiment`, `mentions.summary` (readers work from the claims).
 */
export class Migration20261031180000_claim_model_v2 extends Migration {
	override up(): void {
		this.addSql(`alter table "statements" add column "quote" text null, add column "kind" text null;`);
		this.addSql(`update "statements" set "kind" = 'change' where "change";`);

		this.addSql(
			`insert into "topics" ("key", "label", "kind", "hint", "parent_id")
			select 'ownership', 'Ownership', 'aspect', 'who owns or runs the place: the owner, the family, the management', "id"
			from "topics" where "key" = 'other' and "kind" = 'aspect'
			on conflict ("key") do nothing;`,
		);
		for (const [leaf, base] of FOLDS) {
			this.addSql(
				`update "statements" s set "kind" = 'change'
				from "statement_parts" sp join "topics" t on t.id = sp.topic_id
				where sp.statement_id = s.id and t.key = '${leaf}';`,
			);
			this.addSql(
				`update "statement_parts" set "topic_id" = (select "id" from "topics" where "key" = '${base}')
				where "topic_id" = (select "id" from "topics" where "key" = '${leaf}');`,
			);
			this.addSql(`delete from "topics" where "key" = '${leaf}';`);
		}

		this.addSql(`alter table "statements" drop column "change";`);
		this.addSql(`alter table "reviews" drop column "sentiment";`);
		this.addSql(`alter table "mentions" drop column "sentiment", drop column "summary";`);
	}

	override down(): void {
		// The dropped readings and the folded leaves are not restored: the claims carry what they said
		this.addSql(`alter table "statements" add column "change" boolean not null default false;`);
		this.addSql(`update "statements" set "change" = true where "kind" = 'change';`);
		this.addSql(`alter table "statements" drop column "quote", drop column "kind";`);
		this.addSql(`alter table "reviews" add column "sentiment" text null;`);
		this.addSql(`alter table "mentions" add column "sentiment" text not null default 'neutral', add column "summary" text not null default '';`);
	}
}
